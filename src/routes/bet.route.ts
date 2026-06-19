import { Router } from 'express';
import { BetController } from '../controllers/bet.controller';

const router = Router();

// Routes for bolão questions
router.post('/questions', BetController.createQuestion);
router.get('/questions', BetController.listQuestions);

// Route to place a bet
router.post('/place', BetController.placeBet);

// Route to get all bets for a specific guest
router.get('/rsvp/:rsvpId', BetController.getBetsByRsvp);

export default router;
