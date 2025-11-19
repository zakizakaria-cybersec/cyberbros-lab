import { Env, Assignment, User, Challenge } from '../types';
import { errorResponse, successResponse } from '../utils/response';
import { getUserIdFromRequest, requireAdmin } from '../utils/auth';

/**
 * Create a single assignment
 */
export async function createAssignment(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId || !(await requireAdmin(userId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();
    const { user_id, challenge_id, notes, expires_at } = body;

    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(user_id).first();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Verify challenge exists
    const challenge = await env.DB.prepare(
      'SELECT * FROM challenges WHERE id = ?'
    ).bind(challenge_id).first();

    if (!challenge) {
      return errorResponse('Challenge not found', 404);
    }

    // Check for existing active assignment
    const existing = await env.DB.prepare(`
      SELECT * FROM assignments 
      WHERE user_id = ? AND challenge_id = ? 
      AND status IN ('assigned', 'in_progress')
    `).bind(user_id, challenge_id).first();

    if (existing) {
      return errorResponse('User already has an active assignment for this challenge', 400);
    }

    // Create assignment
    const result = await env.DB.prepare(`
      INSERT INTO assignments (
        user_id, challenge_id, assigned_by, notes, expires_at, assigned_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      RETURNING *
    `).bind(
      user_id,
      challenge_id,
      userId,
      notes || null,
      expires_at || null
    ).first();

    return successResponse(result, 'Assignment created successfully');
  } catch (error) {
    console.error('Create assignment error:', error);
    return errorResponse('Failed to create assignment', 500);
  }
}

/**
 * Bulk create assignments
 */
export async function bulkCreateAssignments(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();
    const { user_ids, challenge_id, notes, expires_at } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse('user_ids must be a non-empty array', 400);
    }

    // Verify challenge exists
    const challenge = await env.DB.prepare(
      'SELECT * FROM challenges WHERE id = ?'
    ).bind(challenge_id).first();

    if (!challenge) {
      return errorResponse('Challenge not found', 404);
    }

    // Verify all users exist
    const placeholders = user_ids.map(() => '?').join(',');
    const { results: users } = await env.DB.prepare(
      `SELECT id FROM users WHERE id IN (${placeholders})`
    ).bind(...user_ids).all();

    const foundUserIds = new Set(users?.map((u: any) => u.id) || []);
    const missingUserIds = user_ids.filter(id => !foundUserIds.has(id));

    if (missingUserIds.length > 0) {
      return errorResponse(`Users not found: ${missingUserIds.join(', ')}`, 404);
    }

    // Create assignments for each user
    const created = [];
    const skipped = [];

    for (const userId of user_ids) {
      // Check for existing active assignment
      const existing = await env.DB.prepare(`
        SELECT * FROM assignments 
        WHERE user_id = ? AND challenge_id = ? 
        AND status IN ('assigned', 'in_progress')
      `).bind(userId, challenge_id).first();

      if (existing) {
        skipped.push(userId);
        continue;
      }

      // Create assignment
      const result = await env.DB.prepare(`
        INSERT INTO assignments (
          user_id, challenge_id, assigned_by, notes, expires_at, assigned_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        RETURNING *
      `).bind(
        userId,
        challenge_id,
        adminId,
        notes || null,
        expires_at || null
      ).first();

      created.push(result);
    }

    return successResponse({
      created: created.length,
      skipped: skipped.length,
      skipped_user_ids: skipped,
      assignments: created
    }, `Created ${created.length} assignments, skipped ${skipped.length}`);
  } catch (error) {
    console.error('Bulk create assignments error:', error);
    return errorResponse('Failed to create assignments', 500);
  }
}

/**
 * Get all assignments (admin view)
 */
export async function getAllAssignments(request: Request, env: Env): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const challengeId = url.searchParams.get('challenge_id');
    const status = url.searchParams.get('status');

    let query = `
      SELECT 
        a.*,
        u.email as user_email,
        c.name as challenge_name,
        admin.email as admin_email
      FROM assignments a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN challenges c ON a.challenge_id = c.id
      LEFT JOIN users admin ON a.assigned_by = admin.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(parseInt(userId));
    }

    if (challengeId) {
      query += ' AND a.challenge_id = ?';
      params.push(parseInt(challengeId));
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.assigned_at DESC';

    // Log for debugging
    console.log(`Executing assignments query: ${query} with params: ${JSON.stringify(params)}`);

    const stmt = env.DB.prepare(query);
    const { results } = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

    return successResponse(results || [], 'Assignments retrieved successfully');
  } catch (error: any) {
    console.error('Get assignments error:', error);
    return errorResponse(`Failed to get assignments: ${error.message || error.toString()}`, 500);
  }
}

/**
 * Get user's own assignments
 */
export async function getUserAssignments(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { results } = await env.DB.prepare(`
      SELECT 
        a.*,
        c.name as challenge_name,
        c.description as challenge_description,
        c.difficulty as challenge_difficulty,
        c.duration_hours as challenge_duration_hours,
        (
          SELECT COUNT(*) FROM instances 
          WHERE assignment_id = a.id 
          AND status IN ('provisioning', 'running')
        ) as has_active_vm
      FROM assignments a
      JOIN challenges c ON a.challenge_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.assigned_at DESC
    `).bind(userId).all();

    return successResponse(results || [], 'User assignments retrieved successfully');
  } catch (error) {
    console.error('Get user assignments error:', error);
    return errorResponse('Failed to get assignments', 500);
  }
}

/**
 * Update assignment
 */
export async function updateAssignment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const body = await request.json();
    const { status, notes, expires_at } = body;

    const assignment = await env.DB.prepare(
      'SELECT * FROM assignments WHERE id = ?'
    ).bind(assignmentId).first();

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    // Build update query
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'completed' && !(assignment as any).completed_at) {
        updates.push("completed_at = datetime('now')");
      }
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      params.push(expires_at);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    params.push(assignmentId);

    const result = await env.DB.prepare(`
      UPDATE assignments 
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `).bind(...params).first();

    return successResponse(result, 'Assignment updated successfully');
  } catch (error) {
    console.error('Update assignment error:', error);
    return errorResponse('Failed to update assignment', 500);
  }
}

/**
 * Delete assignment
 */
export async function deleteAssignment(request: Request, env: Env, assignmentId: string): Promise<Response> {
  try {
    const adminId = await getUserIdFromRequest(request, env);
    if (!adminId || !(await requireAdmin(adminId, env))) {
      return errorResponse('Unauthorized - Admin access required', 403);
    }

    const assignment = await env.DB.prepare(
      'SELECT * FROM assignments WHERE id = ?'
    ).bind(assignmentId).first();

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(assignmentId).run();

    return successResponse(null, 'Assignment deleted successfully');
  } catch (error) {
    console.error('Delete assignment error:', error);
    return errorResponse('Failed to delete assignment', 500);
  }
}
