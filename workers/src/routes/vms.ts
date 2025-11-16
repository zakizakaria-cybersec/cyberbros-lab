import { Env, Challenge, VMInstance, StartChallengeRequest, VMInfoResponse } from '../types';
import { jsonResponse, errorResponse, successResponse } from '../utils/response';
import { getUserIdFromRequest } from '../utils/auth';
import { createHetznerVM } from '../services/hetzner';

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
    const { challenge_id } = body;

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

    // Calculate expiration time
    const lifetimeHours = parseInt(env.VM_DEFAULT_LIFETIME_HOURS || '2');
    const expiresAt = new Date(Date.now() + lifetimeHours * 60 * 60 * 1000).toISOString();

    // Create VM on Hetzner
    const vmName = `lab-${challenge_id}-${userId}-${Date.now()}`;
    const vmInfo = await createHetznerVM(
      env,
      challenge.snapshot_id,
      vmName,
      expiresAt,
      challenge.cpu_count,
      challenge.memory_gb
    );

    // Store VM instance in database
    const result = await env.DB.prepare(`
      INSERT INTO vm_instances (
        user_id, challenge_id, instance_id, public_ip,
        ssh_username, ssh_password, status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), ?)
      RETURNING id
    `).bind(
      userId,
      challenge_id,
      vmInfo.id,
      vmInfo.ip,
      'root',
      vmInfo.password,
      'running',
      expiresAt
    ).first();

    const response: VMInfoResponse = {
      instance_id: vmInfo.id,
      public_ip: vmInfo.ip,
      ssh_username: 'root',
      ssh_password: vmInfo.password,
      status: 'running',
      expires_at: expiresAt,
      time_remaining_minutes: lifetimeHours * 60
    };

    return successResponse(response, 'VM provisioned successfully');
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
