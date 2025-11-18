import { Env, Challenge, VMInstance, StartChallengeRequest, VMInfoResponse } from '../types';
import { jsonResponse, errorResponse, successResponse } from '../utils/response';
import { getUserIdFromRequest } from '../utils/auth';
import { GitHubActionsService } from '../services/github-actions';

/**
 * Start a challenge (provision VM)
 */
export async function startChallenge(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body: StartChallengeRequest = await request.json();
    const { challenge_id, assignment_id } = body;

    // Get challenge details
    const challenge = await env.DB.prepare(
      'SELECT * FROM challenges WHERE id = ?'
    ).bind(challenge_id).first<Challenge>();

    if (!challenge) {
      return errorResponse('Challenge not found', 404);
    }

    // Check if user already has a running VM for this challenge
    const existingVM = await env.DB.prepare(
      'SELECT * FROM vm_instances WHERE user_id = ? AND challenge_id = ? AND status = ?'
    ).bind(userId, challenge_id, 'running').first<VMInstance>();

    if (existingVM) {
      return errorResponse('You already have a running VM for this challenge', 409);
    }

    // Calculate expiration time (use challenge duration if available)
    const lifetimeHours = challenge.duration_hours || parseInt(env.VM_DEFAULT_LIFETIME_HOURS || '2');
    const expiresAt = new Date(Date.now() + lifetimeHours * 60 * 60 * 1000).toISOString();

    // Update assignment status if applicable
    if (assignment_id) {
      await env.DB.prepare(`
        UPDATE assignments 
        SET status = 'in_progress', started_at = datetime('now')
        WHERE id = ? AND status = 'assigned'
      `).bind(assignment_id).run();
    }

    // Create VM instance record with provisioning status
    const vmName = `lab-${challenge_id}-${userId}-${Date.now()}`;
    const result = await env.DB.prepare(`
      INSERT INTO instances (
        user_id, challenge_id, assignment_id, provider, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, datetime("now"), ?)
      RETURNING id
    `).bind(
      userId,
      challenge_id,
      assignment_id || null,
      'scaleway', // Primary provider
      'provisioning',
      expiresAt
    ).first();

    const instanceId = (result as any).id;

    // Log provisioning start
    await env.DB.prepare(`
      INSERT INTO provisioning_logs (instance_id, event_type, provider, message, created_at)
      VALUES (?, ?, ?, ?, datetime("now"))
    `).bind(
      instanceId,
      'provisioning_started',
      'scaleway',
      `Started provisioning VM for challenge: ${challenge.name}`
    ).run();

    // Trigger GitHub Actions workflow for VM provisioning
    const triggered = await GitHubActionsService.enqueueProvisioningJob(env, {
      instance_id: instanceId,
      instance_name: vmName,
      challenge_id: challenge.id,
      challenge_name: challenge.name,
      user_id: userId,
      expires_at: expiresAt,
      cpu_count: challenge.cpu_count,
      memory_gb: challenge.memory_gb
    });

    if (!triggered) {
      // Update status to failed
      await env.DB.prepare(`
        UPDATE instances SET status = 'failed' WHERE id = ?
      `).bind(instanceId).run();
      
      return errorResponse('Failed to trigger VM provisioning', 500);
    }

    // Return provisioning status
    const response = {
      id: instanceId,
      instance_id: null,
      public_ip: null,
      ssh_username: null,
      ssh_password: null,
      status: 'provisioning',
      expires_at: expiresAt,
      time_remaining_minutes: lifetimeHours * 60,
      message: 'VM provisioning initiated. Check status in a moment.'
    };

    return successResponse(response, 'VM provisioning started');
  } catch (error) {
    console.error('Start challenge error:', error);
    return errorResponse('Failed to start challenge', 500);
  }
}

/**
 * Get VM status for a challenge
 */
export async function getChallengeStatus(challengeId: string, request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const vm = await env.DB.prepare(
      'SELECT * FROM vm_instances WHERE user_id = ? AND challenge_id = ? AND status = ?'
    ).bind(userId, challengeId, 'running').first<VMInstance>();

    if (!vm) {
      return jsonResponse({ status: 'not_running', vm: null });
    }

    // Calculate time remaining
    const expiresAt = new Date(vm.expires_at);
    const now = new Date();
    const timeRemainingMs = expiresAt.getTime() - now.getTime();
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / 60000));

    const response: VMInfoResponse = {
      instance_id: vm.instance_id,
      public_ip: vm.public_ip,
      ssh_username: vm.ssh_username,
      ssh_password: vm.ssh_password,
      status: vm.status,
      expires_at: vm.expires_at,
      time_remaining_minutes: timeRemainingMinutes
    };

    return jsonResponse({ status: 'running', vm: response });
  } catch (error) {
    console.error('Get challenge status error:', error);
    return errorResponse('Failed to get VM status', 500);
  }
}

/**
 * Get all user's VMs
 */
export async function getUserVMs(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { results } = await env.DB.prepare(`
      SELECT 
        v.*,
        c.name as challenge_name,
        c.difficulty
      FROM vm_instances v
      JOIN challenges c ON v.challenge_id = c.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `).bind(userId).all();

    return jsonResponse(results || []);
  } catch (error) {
    console.error('Get user VMs error:', error);
    return errorResponse('Failed to get VMs', 500);
  }
}
