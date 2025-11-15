import { Router } from 'express';
import { startChallenge, stopChallenge, getActiveSessions } from '../controllers/vmController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/start/:challengeId', authenticate, startChallenge);
router.delete('/stop/:sessionId', authenticate, stopChallenge);
router.get('/sessions', authenticate, getActiveSessions);

export default router;
