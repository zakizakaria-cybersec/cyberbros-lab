/**
 * Provisioning callback handler
 * Receives callbacks from GitHub Actions after VM provisioning
 */

import { Env } from '../types';
import { errorResponse, successResponse } from '../utils/response';

export async function handleProvisioningCallback(request: Request, env: Env): Promise<Response> {
  try {
    // Verify callback token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.CALLBACK_TOKEN}`) {
      return error('Unauthorized', 401);
    }
    
    const payload = await request.json() as {
      success: boolean;
      instance_id: number;
      cloud_instance_id?: string;
      provider?: string;
      public_ip?: string;
      ssh_username?: string;
      ssh_password?: string;
      error?: string;
    };
    
    console.log('Received provisioning callback:', { instance_id: payload.instance_id, success: payload.success });
    
    if (payload.success) {
      // Update instance in database
      const updateResult = await env.DB.prepare(`
        UPDATE instances 
        SET 
          instance_id = ?,
          provider = ?,
          public_ip = ?,
          ssh_username = ?,
          ssh_password_encrypted = ?,
          status = 'running',
          started_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        payload.cloud_instance_id,
        payload.provider,
        payload.public_ip,
        payload.ssh_username,
        payload.ssh_password, // Should be encrypted in production
        payload.instance_id
      ).run();
      
      // Log success event
      await env.DB.prepare(`
        INSERT INTO provisioning_logs (instance_id, event_type, provider, message, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        payload.instance_id,
        'provisioning_success',
        payload.provider,
        `VM provisioned successfully on ${payload.provider} with IP ${payload.public_ip}`
      ).run();
      
      await env.DB.prepare(`
        INSERT INTO provisioning_logs (instance_id, event_type, provider, message, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        payload.instance_id,
        'vm_running',
        payload.provider,
        'VM is now running and accessible'
      ).run();
      
      return successResponse({ message: 'VM provisioned successfully', instance_id: payload.instance_id });
      
    } else {
      // Update instance as failed
      await env.DB.prepare(`
        UPDATE instances 
        SET status = 'failed'
        WHERE id = ?
      `).bind(payload.instance_id).run();
      
      // Log failure
      await env.DB.prepare(`
        INSERT INTO provisioning_logs (instance_id, event_type, provider, message, error_details, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        payload.instance_id,
        'error',
        'github-actions',
        'VM provisioning failed on both providers',
        JSON.stringify({ error: payload.error })
      ).run();
      
      return successResponse({ message: 'Provisioning failed', instance_id: payload.instance_id });
    }
    
  } catch (err) {
    console.error('Callback handler error:', err);
    return errorResponse('Internal server error', 500);
  }
}

/**
 * Log event callback handler
 */
export async function handleLogCallback(request: Request, env: Env): Promise<Response> {
  try {
    // Verify callback token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.CALLBACK_TOKEN}`) {
      return errorResponse('Unauthorized', 401);
    }
    
    const payload = await request.json() as {
      instance_id: number;
      event_type: string;
      provider?: string;
      message: string;
      error_details?: string;
      metadata?: string;
    };
    
    // Insert log entry
    await env.DB.prepare(`
      INSERT INTO provisioning_logs (instance_id, event_type, provider, message, error_details, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      payload.instance_id,
      payload.event_type,
      payload.provider || null,
      payload.message,
      payload.error_details || null,
      payload.metadata || null
    ).run();
    
    return successResponse({ message: 'Log recorded' });
    
  } catch (err) {
    console.error('Log callback error:', err);
    return errorResponse('Internal server error', 500);
  }
}
