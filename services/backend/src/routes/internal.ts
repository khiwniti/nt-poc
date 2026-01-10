import express from 'express';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    service: 'battery-management-backend',
  });
});

export default router;
