const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  points: number;
  hints?: string[];
}

export interface VMSession {
  id: string;
  ipAddress: string;
  username: string;
  password: string;
  expiresAt: string;
  status: string;
}

export class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async signup(username: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getChallenges(filters?: { difficulty?: string; category?: string }): Promise<{ challenges: Challenge[] }> {
    const params = new URLSearchParams(filters as any);
    return this.request(`/challenges?${params}`);
  }

  async getChallenge(id: string): Promise<{ challenge: Challenge }> {
    return this.request(`/challenges/${id}`);
  }

  async startChallenge(challengeId: string): Promise<{ session: VMSession }> {
    return this.request(`/vm/start/${challengeId}`, {
      method: 'POST',
    });
  }

  async stopChallenge(sessionId: string): Promise<void> {
    return this.request(`/vm/stop/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getActiveSessions(): Promise<{ sessions: VMSession[] }> {
    return this.request('/vm/sessions');
  }
}

export const api = new ApiClient();
