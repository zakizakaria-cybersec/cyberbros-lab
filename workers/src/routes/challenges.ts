import { Env, Challenge } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import { getUserIdFromRequest } from '../utils/auth';

/**
 * Get all challenges
 */
export async function getChallenges(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, description, difficulty, cpu_count, memory_gb FROM challenges'
    ).all<Challenge>();

    return jsonResponse(results || []);
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
