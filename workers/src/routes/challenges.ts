import { Env, Challenge } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { getUserIdFromRequest, requireAdmin } from '../utils/auth';

/**
 * Create a new challenge (Admin only)
 */
export async function createChallenge(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const isAdmin = await requireAdmin(userId, env);
    if (!isAdmin) {
      return errorResponse('Unauthorized - Admin only', 403);
    }

    const body = await request.json() as {
      name: string;
      description: string;
      difficulty: string;
      cpu_count: number;
      memory_gb: number;
      snapshot_id?: string;
    };

    // Validate required fields
    if (!body.name || !body.description || !body.difficulty) {
      return errorResponse('Missing required fields: name, description, difficulty', 400);
    }

    // Map difficulty to schema values
    const difficultyMap: Record<string, string> = {
      'easy': 'beginner',
      'medium': 'intermediate',
      'hard': 'advanced',
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    };

    const difficulty = difficultyMap[body.difficulty.toLowerCase()];
    if (!difficulty) {
      return errorResponse('Difficulty must be: easy, medium, or hard', 400);
    }

    // Set defaults for cpu and memory if not provided
    const cpu_count = body.cpu_count || 2;
    const memory_gb = body.memory_gb || 2;
    
    // Generate snapshot_id if not provided
    const snapshot_id = body.snapshot_id || `snapshot-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Insert challenge
    const result = await env.DB.prepare(
      'INSERT INTO challenges (name, description, difficulty, cpu_count, memory_gb, snapshot_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.name, body.description, difficulty, cpu_count, memory_gb, snapshot_id, userId).run();

    if (!result.success) {
      return errorResponse('Failed to create challenge', 500);
    }

    // Fetch the created challenge
    const challenge = await env.DB.prepare(
      'SELECT id, name, description, difficulty, cpu_count, memory_gb, snapshot_id FROM challenges WHERE id = ?'
    ).bind(result.meta.last_row_id).first<Challenge>();

    return jsonResponse(challenge, 201);
  } catch (error: any) {
    console.error('Create challenge error:', error);
    return errorResponse(error.message || 'Failed to create challenge', 500);
  }
}

/**
 * Get all challenges
 */
export async function getChallenges(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const isAdmin = await requireAdmin(userId, env);

    if (isAdmin) {
      const { results } = await env.DB.prepare(
        'SELECT id, name, description, difficulty, cpu_count, memory_gb FROM challenges'
      ).all<Challenge>();
      return jsonResponse(results || []);
    } else {
      const { results } = await env.DB.prepare(
        `SELECT c.id, c.name, c.description, c.difficulty, c.cpu_count, c.memory_gb 
         FROM challenges c
         JOIN assignments a ON c.id = a.challenge_id
         WHERE a.user_id = ?`
      ).bind(userId).all<Challenge>();
      return jsonResponse(results || []);
    }
  } catch (error) {
    console.error('Get challenges error:', error);
    return errorResponse('Failed to get challenges', 500);
  }
}

/**
 * Get a specific challenge
 */
export async function getChallenge(challengeId: string, request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const challenge = await env.DB.prepare(
      'SELECT id, name, description, difficulty, cpu_count, memory_gb FROM challenges WHERE id = ?'
    ).bind(challengeId).first<Challenge>();

    if (!challenge) {
      return errorResponse('Challenge not found', 404);
    }

    return jsonResponse(challenge);
  } catch (error) {
    console.error('Get challenge error:', error);
    return errorResponse('Failed to get challenge', 500);
  }
}

/**
 * Delete a challenge (Admin only)
 */
export async function deleteChallenge(request: Request, env: Env, challengeId: string): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const isAdmin = await requireAdmin(userId, env);
    if (!isAdmin) {
      return errorResponse('Unauthorized - Admin only', 403);
    }

    // Check if challenge exists
    const challenge = await env.DB.prepare(
      'SELECT id FROM challenges WHERE id = ?'
    ).bind(challengeId).first();

    if (!challenge) {
      return errorResponse('Challenge not found', 404);
    }

    // Check if there are active assignments/instances
    const activeAssignments = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM assignments WHERE challenge_id = ? AND status IN ('assigned', 'in_progress')"
    ).bind(challengeId).first<{ count: number }>();

    if (activeAssignments && activeAssignments.count > 0) {
      return errorResponse('Cannot delete challenge with active assignments', 400);
    }

    // Delete challenge
    await env.DB.prepare('DELETE FROM challenges WHERE id = ?').bind(challengeId).run();

    return successResponse(null, 'Challenge deleted successfully');
  } catch (error: any) {
    console.error('Delete challenge error:', error);
    return errorResponse(error.message || 'Failed to delete challenge', 500);
  }
}
