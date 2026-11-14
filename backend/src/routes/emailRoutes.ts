import { Router } from 'express';
import {
  createScheduledEmail,
  listScheduledEmails,
  listSentEmails,
  getEmailDetails,
  cancelEmail,
} from '../controllers/emailController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All email routes require authentication
router.use(authenticate);

router.post('/schedule', createScheduledEmail);
router.get('/scheduled', listScheduledEmails);
router.get('/sent', listSentEmails);
router.get('/:id', getEmailDetails);
router.post('/:id/cancel', cancelEmail);

export default router;
