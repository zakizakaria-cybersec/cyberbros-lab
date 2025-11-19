import { Env } from '../types';
import { errorResponse, successResponse } from '../utils/response';
import { getUserIdFromRequest, requireAdmin } from '../utils/auth';

/**
 * Get all users (admin only)
 */
export async function getAllUsers(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const isActive = url.searchParams.get('is_active');

    let query = 'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (isActive !== null) {
      query += ' AND is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    // Log for debugging
    console.log(`Executing query: ${query} with params: ${JSON.stringify(params)}`);

    const stmt = env.DB.prepare(query);
    const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

    return successResponse(results || [], 'Users retrieved successfully');
  } catch (error: any) {
    console.error('Get users error:', error);
    // Return the full error object for debugging
    return errorResponse(`Failed to get users: ${error.message || error.toString()}`, 500);
  }
}

/**
 * Get user by ID (admin only)
 */
export async function getUserById(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const user = await env.DB.prepare(
      'SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user, 'User retrieved successfully');
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Failed to get user', 500);
  }
}
