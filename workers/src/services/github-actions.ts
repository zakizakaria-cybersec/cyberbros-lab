/**
 * Cloudflare Worker service for triggering VM provisioning via GitHub Actions
 */

import { Env } from './types';

export class GitHubActionsService {
  
  /**
   * Trigger GitHub Actions workflow to provision VM
   */
  static async triggerProvisionWorkflow(
    env: Env,
    payload: {
      instance_id: number;
      instance_name: string;
      challenge_id: number;
      challenge_name: string;
      user_id: number;
      expires_at: string;
      cpu_count: number;
      memory_gb: number;
    }
  ): Promise<boolean> {
    const githubRepo = env.GITHUB_REPO || 'owner/repo';
    const githubToken = env.GITHUB_TOKEN;
    const callbackUrl = env.BACKEND_URL || 'https://api.cyberbros.lab';
    
    const url = `https://api.github.com/repos/${githubRepo}/dispatches`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CyberBros-Lab-Worker'
        },
        body: JSON.stringify({
          event_type: 'provision-vm',
          client_payload: {
            ...payload,
            callback_url: `${callbackUrl}/api/provisioning/callback`
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('GitHub Actions trigger failed:', error);
        return false;
      }
      
      console.log('Successfully triggered GitHub Actions workflow');
      return true;
      
    } catch (error) {
      console.error('Error triggering GitHub Actions:', error);
      return false;
    }
  }
  
  /**
   * Trigger destroy workflow
   */
  static async triggerDestroyWorkflow(
    env: Env,
    instanceId: number,
    provider: string
  ): Promise<boolean> {
    const githubRepo = env.GITHUB_REPO || 'owner/repo';
    const githubToken = env.GITHUB_TOKEN;
    
    const url = `https://api.github.com/repos/${githubRepo}/dispatches`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CyberBros-Lab-Worker'
        },
        body: JSON.stringify({
          event_type: 'destroy-vm',
          client_payload: {
            instance_id: instanceId,
            provider: provider
          }
        })
      });
      
      if (!response.ok) {
        console.error('GitHub Actions destroy trigger failed');
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error triggering destroy workflow:', error);
      return false;
    }
  }
  
  /**
   * Enqueue provisioning job to Cloudflare Queue
   */
  static async enqueueProvisioningJob(
    env: Env,
    payload: any
  ): Promise<boolean> {
    try {
      // If you have Cloudflare Queues configured
      if (env.PROVISIONING_QUEUE) {
        await env.PROVISIONING_QUEUE.send(payload);
        console.log('Job enqueued to Cloudflare Queue');
        return true;
      } else {
        // Direct trigger if no queue
        return await this.triggerProvisionWorkflow(env, payload);
      }
    } catch (error) {
      console.error('Error enqueuing job:', error);
      return false;
    }
  }
}
