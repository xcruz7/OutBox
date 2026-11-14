import { Router } from 'express';
import authRoutes from './authRoutes.js';
import emailRoutes from './emailRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'outbox-scheduler-api',
  });
});

export default router;
