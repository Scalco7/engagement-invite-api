import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database connectivity test using raw query
router.get('/db-test', async (req: Request, res: Response) => {
  try {
    // Executes a native/raw query
    const result = await prisma.$queryRaw`SELECT NOW() as db_time;`;
    res.json({
      status: 'connected',
      result
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to the database',
      error: error.message
    });
  }
});

// Default API endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from the Engagement Invite API Router!'
  });
});

export default router;
