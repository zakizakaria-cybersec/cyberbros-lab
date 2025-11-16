import { Env, HetznerServerCreateRequest, HetznerServerResponse } from '../types';

/**
 * Create a VM on Hetzner Cloud
 */
export async function createHetznerVM(
  env: Env,
  snapshotId: string,
  name: string,
  expiresAt: string,
  cpuCount: number = 2,
  memoryGb: number = 4
): Promise<{ id: string; ip: string; password: string }> {
  const serverType = getServerType(cpuCount, memoryGb);
  
  const payload: HetznerServerCreateRequest = {
    name,
    server_type: serverType,
    image: snapshotId,
    location: 'nbg1',
    start_after_create: true,
    labels: {
      managed_by: 'cyberbros-lab',
      expires_at: expiresAt,
    },
    public_net: {
      enable_ipv4: true,
      enable_ipv6: false,
    },
  };

  const response = await fetch(`${env.HETZNER_API_BASE_URL}/servers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.HETZNER_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Hetzner API error:', error);
    throw new Error(`Failed to create VM: ${response.statusText}`);
  }

  const data: HetznerServerResponse = await response.json();
  
  return {
    id: data.server.id.toString(),
    ip: data.server.public_net.ipv4.ip,
    password: data.root_password || '',
  };
}

/**
 * Destroy a VM on Hetzner Cloud
 */
export async function destroyHetznerVM(env: Env, instanceId: string): Promise<boolean> {
  try {
    const response = await fetch(`${env.HETZNER_API_BASE_URL}/servers/${instanceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${env.HETZNER_API_TOKEN}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to destroy VM:', error);
    return false;
  }
}

/**
 * Get VM status from Hetzner Cloud
 */
export async function getHetznerVMStatus(env: Env, instanceId: string): Promise<string | null> {
  try {
    const response = await fetch(`${env.HETZNER_API_BASE_URL}/servers/${instanceId}`, {
      headers: {
        'Authorization': `Bearer ${env.HETZNER_API_TOKEN}`,
      },
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    return data.server.status;
  } catch (error) {
    console.error('Failed to get VM status:', error);
    return null;
  }
}

/**
 * Map CPU and memory requirements to Hetzner server types
 */
function getServerType(cpuCount: number, memoryGb: number): string {
  if (cpuCount <= 2 && memoryGb <= 4) {
    return 'cx11'; // 1 vCPU, 2GB RAM
  } else if (cpuCount <= 2 && memoryGb <= 8) {
    return 'cpx11'; // 2 vCPU, 2GB RAM
  } else if (cpuCount <= 4 && memoryGb <= 8) {
    return 'cpx21'; // 3 vCPU, 4GB RAM
  } else if (cpuCount <= 4 && memoryGb <= 16) {
    return 'cpx31'; // 4 vCPU, 8GB RAM
  } else {
    return 'cpx41'; // 8 vCPU, 16GB RAM
  }
}
