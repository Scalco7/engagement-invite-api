import { Router } from 'express';
import { RsvpController } from '../controllers/rsvp.controller';

const router = Router();

// Attach controller methods to routes
router.post('/', RsvpController.create);
router.get('/', RsvpController.list);
router.post('/lookup', RsvpController.lookup);

export default router;
