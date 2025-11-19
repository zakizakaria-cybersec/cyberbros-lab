// test ci-cd automation

import { Env } from './types';
import { corsResponse, errorResponse } from './utils/response';
import { register, login, getCurrentUser } from './routes/auth';
import { getChallenges, getChallenge, createChallenge, deleteChallenge } from './routes/challenges';
import { startChallenge, getChallengeStatus, getUserVMs } from './routes/vms';
import { handleProvisioningCallback, handleLogCallback } from './routes/provisioning';
import { 
  createAssignment, 
  bulkCreateAssignments, 
  getAllAssignments, 
  getUserAssignments,
  updateAssignment,
  deleteAssignment 
} from './routes/assignments';
import { getAllUsers, getUserById } from './routes/users';
import { GitHubActionsService } from './services/github-actions';

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
      
      if (path === '/api/admin/challenges' && method === 'GET') {
        return getChallenges(request, env);
      }
      
      if (path === '/api/admin/challenges' && method === 'POST') {
        return createChallenge(request, env);
      }
      
      if (path.match(/^\/api\/challenges\/\d+$/) && method === 'GET') {
        const challengeId = path.split('/')[3];
        return getChallenge(challengeId, request, env);
      }

      if (path.match(/^\/api\/admin\/challenges\/\d+$/) && method === 'DELETE') {
        const challengeId = path.split('/')[4];
        return deleteChallenge(request, env, challengeId);
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

      // Assignment routes
      if (path === '/api/user/assignments' && method === 'GET') {
        return getUserAssignments(request, env);
      }
      
      if (path === '/api/admin/assignments' && method === 'GET') {
        return getAllAssignments(request, env);
      }
      
      if (path === '/api/admin/assignments' && method === 'POST') {
        return createAssignment(request, env);
      }
      
      if (path === '/api/admin/assignments/bulk' && method === 'POST') {
        return bulkCreateAssignments(request, env);
      }
      
      if (path.match(/^\/api\/admin\/assignments\/\d+$/) && method === 'PUT') {
        const assignmentId = path.split('/')[4];
        return updateAssignment(request, env, assignmentId);
      }
      
      if (path.match(/^\/api\/admin\/assignments\/\d+$/) && method === 'DELETE') {
        const assignmentId = path.split('/')[4];
        return deleteAssignment(request, env, assignmentId);
      }
      
      // User routes (admin)
      if (path === '/api/admin/users' && method === 'GET') {
        return getAllUsers(request, env);
      }
      
      if (path.match(/^\/api\/admin\/users\/\d+$/) && method === 'GET') {
        const userId = path.split('/')[4];
        return getUserById(request, env, userId);
      }

      // Provisioning callback routes (called by GitHub Actions)
      if (path === '/api/provisioning/callback' && method === 'POST') {
        return handleProvisioningCallback(request, env);
      }
      
      if (path === '/api/provisioning/callback/log' && method === 'POST') {
        return handleLogCallback(request, env);
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

      // Destroy each expired VM via GitHub Actions
      for (const vm of results || []) {
        try {
          // Trigger destroy workflow
          const triggered = await GitHubActionsService.triggerDestroyWorkflow(
            env, 
            vm.id as number,
            vm.provider as string || 'hetzner'
          );
          
          if (triggered) {
            // Mark as destroying
            await env.DB.prepare(`
              UPDATE instances 
              SET status = ?
              WHERE id = ?
            `).bind('destroying', vm.id).run();
            
            console.log(`Triggered destroy for VM ${vm.id}`);
          } else {
            console.error(`Failed to trigger destroy for VM ${vm.id}`);
          }
        } catch (error) {
          console.error(`Error destroying VM ${vm.id}:`, error);
        }
      }

      console.log('VM cleanup job completed');
    } catch (error) {
      console.error('VM cleanup job error:', error);
    }
  }
};
