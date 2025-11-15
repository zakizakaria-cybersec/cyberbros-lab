import VMSession, { IVMSession } from '../models/VMSession';
import Challenge, { IChallenge } from '../models/Challenge';
import { HetznerService } from './hetznerService';
import { ScalewayService } from './scalewayService';
import mongoose from 'mongoose';

export class VMService {
  private hetznerService: HetznerService | null;
  private scalewayService: ScalewayService | null;
  private autoDeleteHours: number;

  constructor() {
    const hetznerToken = process.env.HETZNER_API_TOKEN;
    const scalewayKey = process.env.SCALEWAY_API_KEY;
    const scalewaySecret = process.env.SCALEWAY_API_SECRET;
    const scalewayOrgId = process.env.SCALEWAY_ORGANIZATION_ID;

    this.hetznerService = hetznerToken ? new HetznerService(hetznerToken) : null;
    this.scalewayService = (scalewayKey && scalewaySecret && scalewayOrgId) 
      ? new ScalewayService(scalewayKey, scalewaySecret, scalewayOrgId) 
      : null;
    
    this.autoDeleteHours = parseInt(process.env.VM_AUTO_DELETE_HOURS || '2', 10);
  }

  async createVM(userId: string, challengeId: string): Promise<IVMSession> {
    // Check if user already has an active session for this challenge
    const existingSession = await VMSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      challengeId: new mongoose.Types.ObjectId(challengeId),
      status: { $in: ['creating', 'running'] }
    });

    if (existingSession) {
      return existingSession;
    }

    // Get challenge configuration
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Prefer Hetzner, fallback to Scaleway
    const provider = this.hetznerService ? 'hetzner' : 'scaleway';
    
    if (!this.hetznerService && !this.scalewayService) {
      throw new Error('No VM provider configured');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.autoDeleteHours);

    let vmSession: IVMSession;

    try {
      if (provider === 'hetzner' && this.hetznerService) {
        const result = await this.hetznerService.createServer({
          name: `cyberbros-${userId}-${challengeId}`,
          server_type: challenge.vmConfig.serverType,
          image: challenge.vmConfig.imageId,
          location: challenge.vmConfig.location
        });

        vmSession = await VMSession.create({
          userId,
          challengeId,
          vmId: result.server.id.toString(),
          provider: 'hetzner',
          ipAddress: result.server.public_net.ipv4.ip,
          username: 'root',
          password: result.password,
          status: 'running',
          expiresAt
        });
      } else if (provider === 'scaleway' && this.scalewayService) {
        const result = await this.scalewayService.createServer({
          name: `cyberbros-${userId}-${challengeId}`,
          commercial_type: challenge.vmConfig.serverType,
          image: challenge.vmConfig.imageId,
          zone: challenge.vmConfig.location
        });

        vmSession = await VMSession.create({
          userId,
          challengeId,
          vmId: result.server.id,
          provider: 'scaleway',
          ipAddress: result.server.public_ip?.address || 'pending',
          username: 'root',
          password: result.password,
          status: 'running',
          expiresAt
        });
      } else {
        throw new Error('No VM provider available');
      }

      return vmSession;
    } catch (error: any) {
      console.error('VM creation error:', error);
      
      // Create error session record
      vmSession = await VMSession.create({
        userId,
        challengeId,
        vmId: 'error',
        provider,
        ipAddress: 'error',
        username: 'root',
        password: 'error',
        status: 'error',
        expiresAt,
        errorMessage: error.message
      });

      throw error;
    }
  }

  async deleteVM(sessionId: string): Promise<void> {
    const session = await VMSession.findById(sessionId);
    
    if (!session) {
      throw new Error('VM session not found');
    }

    if (session.status === 'deleted') {
      return;
    }

    try {
      if (session.provider === 'hetzner' && this.hetznerService) {
        await this.hetznerService.deleteServer(session.vmId);
      } else if (session.provider === 'scaleway' && this.scalewayService) {
        await this.scalewayService.deleteServer(session.vmId);
      }

      session.status = 'deleted';
      session.deletedAt = new Date();
      await session.save();
    } catch (error: any) {
      console.error('VM deletion error:', error);
      session.status = 'error';
      session.errorMessage = error.message;
      await session.save();
      throw error;
    }
  }

  async deleteExpiredVMs(): Promise<number> {
    const expiredSessions = await VMSession.find({
      status: { $in: ['running', 'creating'] },
      expiresAt: { $lte: new Date() }
    });

    let deletedCount = 0;

    for (const session of expiredSessions) {
      try {
        await this.deleteVM((session._id as mongoose.Types.ObjectId).toString());
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete expired VM ${session._id}:`, error);
      }
    }

    return deletedCount;
  }

  async getUserActiveSessions(userId: string): Promise<IVMSession[]> {
    return VMSession.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['creating', 'running'] }
    }).populate('challengeId');
  }
}
