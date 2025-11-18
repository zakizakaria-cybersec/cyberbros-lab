// Environment bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace for sessions
  SESSIONS: KVNamespace;
  
  // Queue for provisioning jobs (optional)
  PROVISIONING_QUEUE?: Queue;
  
  // Durable Object for VM status (optional)
  VM_STATUS?: DurableObjectNamespace;
  
  // Secrets
  JWT_SECRET: string;
  HETZNER_API_TOKEN: string;
  CALLBACK_TOKEN: string;
  
  // GitHub Actions integration
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  
  // Backend URL for callbacks
  BACKEND_URL: string;
  
  // Environment variables
  ENVIRONMENT: string;
  JWT_EXPIRATION_MINUTES: string;
  VM_DEFAULT_LIFETIME_HOURS: string;
  VM_CLEANUP_INTERVAL_MINUTES: string;
  HETZNER_API_BASE_URL: string;
}

// Database models
export interface User {
  id: number;
  email: string;
  hashed_password: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  snapshot_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cpu_count: number;
  memory_gb: number;
  duration_hours: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: number;
  user_id: number;
  challenge_id: number;
  assigned_by: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired';
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  notes?: string;
}

export interface Instance {
  id: number;
  user_id: number;
  challenge_id: number;
  assignment_id?: number;
  instance_id: string;
  provider: 'hetzner' | 'aws' | 'digitalocean' | 'fallback';
  public_ip: string;
  ssh_username: string;
  ssh_password_encrypted?: string;
  ssh_private_key_encrypted?: string;
  status: 'provisioning' | 'running' | 'expired' | 'destroying' | 'destroyed' | 'failed';
  created_at: string;
  started_at?: string;
  expires_at: string;
  destroyed_at?: string;
  server_type?: string;
  location?: string;
}

export interface ProvisioningLog {
  id: number;
  instance_id: number;
  event_type: 'provisioning_started' | 'provisioning_success' | 'provisioning_failed' | 
              'provider_fallback' | 'vm_starting' | 'vm_running' | 'vm_stopping' | 
              'vm_expired' | 'vm_destroying' | 'vm_destroyed' | 'error';
  provider?: string;
  message: string;
  error_details?: string;
  metadata?: string;
  created_at: string;
}

// Legacy alias for backwards compatibility
export interface VMInstance extends Instance {}


// API Request/Response types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface StartChallengeRequest {
  challenge_id: number;
}

export interface VMInfoResponse {
  instance_id: string;
  public_ip: string;
  ssh_username: string;
  ssh_password: string;
  status: string;
  expires_at: string;
  time_remaining_minutes: number;
}

// Hetzner API types
export interface HetznerServerType {
  id: number;
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
}

export interface HetznerServerCreateRequest {
  name: string;
  server_type: string;
  image: string;
  location: string;
  start_after_create: boolean;
  labels: Record<string, string>;
  public_net?: {
    enable_ipv4: boolean;
    enable_ipv6: boolean;
  };
}

export interface HetznerServerResponse {
  server: {
    id: number;
    name: string;
    status: string;
    public_net: {
      ipv4: {
        ip: string;
      };
    };
  };
  root_password?: string;
  action: {
    id: number;
    status: string;
  };
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user_id
  email: string;
  role: 'user' | 'admin';
  exp: number;
  iat: number;
}
