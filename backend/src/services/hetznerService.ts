import axios from 'axios';

interface HetznerServerConfig {
  name: string;
  server_type: string;
  image: string;
  location: string;
  user_data?: string;
}

interface HetznerServer {
  id: number;
  name: string;
  public_net: {
    ipv4: {
      ip: string;
    };
  };
  root_password: string;
}

export class HetznerService {
  private apiToken: string;
  private baseUrl = 'https://api.hetzner.cloud/v1';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async createServer(config: HetznerServerConfig): Promise<{ server: HetznerServer; password: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/servers`,
        config,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        server: response.data.server,
        password: response.data.root_password
      };
    } catch (error: any) {
      console.error('Hetzner API error:', error.response?.data || error.message);
      throw new Error(`Failed to create Hetzner server: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async deleteServer(serverId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/servers/${serverId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
    } catch (error: any) {
      console.error('Hetzner API error:', error.response?.data || error.message);
      throw new Error(`Failed to delete Hetzner server: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getServerStatus(serverId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/servers/${serverId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
      return response.data.server.status;
    } catch (error: any) {
      console.error('Hetzner API error:', error.response?.data || error.message);
      throw new Error(`Failed to get Hetzner server status: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
