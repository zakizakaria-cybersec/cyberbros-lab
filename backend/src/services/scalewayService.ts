import axios from 'axios';
import crypto from 'crypto';

interface ScalewayServerConfig {
  name: string;
  commercial_type: string;
  image: string;
  zone: string;
}

interface ScalewayServer {
  id: string;
  name: string;
  public_ip?: {
    address: string;
  };
}

export class ScalewayService {
  private apiKey: string;
  private secretKey: string;
  private organizationId: string;
  private baseUrl = 'https://api.scaleway.com/instance/v1';

  constructor(apiKey: string, secretKey: string, organizationId: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.organizationId = organizationId;
  }

  async createServer(config: ScalewayServerConfig): Promise<{ server: ScalewayServer; password: string }> {
    try {
      const zone = config.zone || 'fr-par-1';
      const password = this.generatePassword();

      const response = await axios.post(
        `${this.baseUrl}/zones/${zone}/servers`,
        {
          name: config.name,
          commercial_type: config.commercial_type,
          image: config.image,
          organization: this.organizationId,
          project: this.organizationId
        },
        {
          headers: {
            'X-Auth-Token': this.secretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const server = response.data.server;

      // Start the server
      await axios.post(
        `${this.baseUrl}/zones/${zone}/servers/${server.id}/action`,
        { action: 'poweron' },
        {
          headers: {
            'X-Auth-Token': this.secretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        server,
        password
      };
    } catch (error: any) {
      console.error('Scaleway API error:', error.response?.data || error.message);
      throw new Error(`Failed to create Scaleway server: ${error.response?.data?.message || error.message}`);
    }
  }

  async deleteServer(serverId: string, zone: string = 'fr-par-1'): Promise<void> {
    try {
      // Stop the server first
      await axios.post(
        `${this.baseUrl}/zones/${zone}/servers/${serverId}/action`,
        { action: 'terminate' },
        {
          headers: {
            'X-Auth-Token': this.secretKey,
            'Content-Type': 'application/json'
          }
        }
      );

      // Wait a bit before deleting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Delete the server
      await axios.delete(
        `${this.baseUrl}/zones/${zone}/servers/${serverId}`,
        {
          headers: {
            'X-Auth-Token': this.secretKey
          }
        }
      );
    } catch (error: any) {
      console.error('Scaleway API error:', error.response?.data || error.message);
      throw new Error(`Failed to delete Scaleway server: ${error.response?.data?.message || error.message}`);
    }
  }

  async getServerStatus(serverId: string, zone: string = 'fr-par-1'): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/zones/${zone}/servers/${serverId}`,
        {
          headers: {
            'X-Auth-Token': this.secretKey
          }
        }
      );
      return response.data.server.state;
    } catch (error: any) {
      console.error('Scaleway API error:', error.response?.data || error.message);
      throw new Error(`Failed to get Scaleway server status: ${error.response?.data?.message || error.message}`);
    }
  }

  private generatePassword(length: number = 16): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }
}
