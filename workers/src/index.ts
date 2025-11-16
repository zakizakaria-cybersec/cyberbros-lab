import { Env } from './types';
import { corsResponse, errorResponse } from './utils/response';
import { register, login, getCurrentUser } from './routes/auth';
import { getChallenges, getChallenge } from './routes/challenges';
import { startChallenge, getChallengeStatus, getUserVMs } from './routes/vms';
import { destroyHetznerVM } from './services/hetzner';

export default {
  /**
   * Main fetch handler
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Health check
      if (path === '/health' || path === '/') {
        return new Response(JSON.stringify({ 
          status: 'healthy',
          version: '1.0.0',
          environment: env.ENVIRONMENT 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Auth routes
      if (path === '/api/register' && method === 'POST') {
        return register(request, env);
      }
      
      if (path === '/api/login' && method === 'POST') {
        return login(request, env);
      }
      
      if (path === '/api/me' && method === 'GET') {
        return getCurrentUser(request, env);
      }

      // Challenge routes
      if (path === '/api/challenges' && method === 'GET') {
        return getChallenges(request, env);
      }
      
      if (path.match(/^\/api\/challenges\/\d+$/) && method === 'GET') {
        const challengeId = path.split('/')[3];
        return getChallenge(challengeId, request, env);
      }

      // VM routes
      if (path === '/api/challenge/start' && method === 'POST') {
        return startChallenge(request, env);
      }
      
      if (path.match(/^\/api\/challenge\/\d+\/status$/) && method === 'GET') {
        const challengeId = path.split('/')[3];
        return getChallengeStatus(challengeId, request, env);
      }
      
      if (path === '/api/vms' && method === 'GET') {
        return getUserVMs(request, env);
      }

      // 404 - Not Found
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Request error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },

  /**
   * Scheduled handler for VM cleanup
   */
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log('Running VM cleanup job...');

    try {
      // Find expired VMs
      const { results } = await env.DB.prepare(`
        SELECT * FROM vm_instances 
        WHERE expires_at < datetime("now") 
        AND status = ?
      `).bind('running').all();

      console.log(`Found ${results?.length || 0} expired VMs`);

      // Destroy each expired VM
      for (const vm of results || []) {
        try {
          const destroyed = await destroyHetznerVM(env, vm.instance_id as string);
          
          if (destroyed) {
            await env.DB.prepare(`
              UPDATE vm_instances 
              SET status = ?, destroyed_at = datetime("now")
              WHERE id = ?
            `).bind('destroyed', vm.id).run();
            
            console.log(`Destroyed VM ${vm.instance_id}`);
          } else {
            console.error(`Failed to destroy VM ${vm.instance_id}`);
          }
        } catch (error) {
          console.error(`Error destroying VM ${vm.instance_id}:`, error);
        }
      }

      console.log('VM cleanup job completed');
    } catch (error) {
      console.error('VM cleanup job error:', error);
    }
  }
};
