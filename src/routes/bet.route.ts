import { Router } from 'express';
import { BetController } from '../controllers/bet.controller';

const router = Router();

// Routes for bolão questions
router.post('/questions', BetController.createQuestion);
router.get('/questions', BetController.listQuestions);

// Route to place a bet
router.post('/place', BetController.placeBet);

export default router;
