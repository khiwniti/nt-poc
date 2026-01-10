import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development',
    version: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || null,
  });
});

export default router;

