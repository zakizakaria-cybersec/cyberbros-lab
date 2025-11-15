import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Challenge from '../models/Challenge';

export const getChallenges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, category } = req.query;
    
    const filter: any = {};
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;

    const challenges = await Challenge.find(filter).select('-flags');
    res.json({ challenges });
  } catch (error: any) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

export const getChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const challenge = await Challenge.findById(id).select('-flags');
    
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json({ challenge });
  } catch (error: any) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
};

export const createChallenge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const challengeData = req.body;
    const challenge = await Challenge.create(challengeData);
    res.status(201).json({ challenge });
  } catch (error: any) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};
