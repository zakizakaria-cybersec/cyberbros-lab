import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VMService } from '../services/vmService';

const vmService = new VMService();

export const startChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    const userId = req.userId!;

    const vmSession = await vmService.createVM(userId, challengeId);

    res.json({
      message: 'VM created successfully',
      session: {
        id: vmSession._id,
        ipAddress: vmSession.ipAddress,
        username: vmSession.username,
        password: vmSession.password,
        expiresAt: vmSession.expiresAt,
        status: vmSession.status
      }
    });
  } catch (error: any) {
    console.error('Start challenge error:', error);
    res.status(500).json({ error: error.message || 'Failed to start challenge' });
  }
};

export const stopChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    await vmService.deleteVM(sessionId);

    res.json({ message: 'VM stopped and deleted successfully' });
  } catch (error: any) {
    console.error('Stop challenge error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop challenge' });
  }
};

export const getActiveSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const sessions = await vmService.getUserActiveSessions(userId);

    res.json({ sessions });
  } catch (error: any) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
};
