// Environment bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace for sessions
  SESSIONS: KVNamespace;
  
  // Durable Object for VM status (optional)
  VM_STATUS?: DurableObjectNamespace;
  
  // Secrets
  JWT_SECRET: string;
  HETZNER_API_TOKEN: string;
  
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
  created_at: string;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  snapshot_id: string;
  difficulty: string;
  cpu_count: number;
  memory_gb: number;
}

export interface VMInstance {
  id: number;
  user_id: number;
  challenge_id: number;
  instance_id: string;
  public_ip: string;
  ssh_username: string;
  ssh_password: string;
  status: 'pending' | 'running' | 'expired' | 'destroyed';
  created_at: string;
  expires_at: string;
  destroyed_at?: string;
}

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
  exp: number;
  iat: number;
}
