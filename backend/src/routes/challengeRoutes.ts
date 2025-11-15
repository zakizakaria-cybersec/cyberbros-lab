import { Router } from 'express';
import { getChallenges, getChallenge, createChallenge } from '../controllers/challengeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getChallenges);
router.get('/:id', authenticate, getChallenge);
router.post('/', authenticate, createChallenge);

export default router;
