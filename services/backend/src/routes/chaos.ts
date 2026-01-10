import express from 'express';
import { chaosMonkey } from '../chaos/chaosMonkey.js';
import type { Request, Response } from 'express';

const router = express.Router();

// Get current chaos configuration
router.get('/config', (req: Request, res: Response) => {
  res.json(chaosMonkey.getConfig());
});

// Update chaos configuration
router.post('/config', (req: Request, res: Response) => {
  try {
    const { enabled, failureRate, scenarios, networkLatencyMs } = req.body;

    const updates: any = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof failureRate === 'number' && failureRate >= 0 && failureRate <= 1) {
      updates.failureRate = failureRate;
    }
    if (scenarios) updates.scenarios = scenarios;
    if (networkLatencyMs) updates.networkLatencyMs = networkLatencyMs;

    chaosMonkey.updateConfig(updates);
    res.json({ success: true, config: chaosMonkey.getConfig() });
  } catch (error) {
    res.status(400).json({ error: 'Invalid configuration' });
  }
});

// Enable chaos testing
router.post('/enable', (req: Request, res: Response) => {
  chaosMonkey.updateConfig({ enabled: true });
  res.json({ success: true, enabled: true });
});

// Disable chaos testing
router.post('/disable', (req: Request, res: Response) => {
  chaosMonkey.updateConfig({ enabled: false });
  res.json({ success: true, enabled: false });
});

// Test specific failure scenario
router.post('/test/:scenario', async (req: Request, res: Response) => {
  const { scenario } = req.params;

  try {
    switch (scenario) {
      case 'service-failure':
        await chaosMonkey.injectServiceFailure();
        res.json({ success: true, message: 'No failure injected this time' });
        break;
      case 'network-latency':
        const start = Date.now();
        await chaosMonkey.injectNetworkLatency();
        const elapsed = Date.now() - start;
        res.json({ success: true, latencyMs: elapsed });
        break;
      case 'database-failure':
        const dbFailed = chaosMonkey.shouldInjectDatabaseFailure();
        res.json({ success: true, failureInjected: dbFailed });
        break;
      case 'redis-failure':
        const redisFailed = chaosMonkey.shouldInjectRedisFailure();
        res.json({ success: true, failureInjected: redisFailed });
        break;
      default:
        res.status(400).json({ error: 'Unknown scenario' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message, failureInjected: true });
  }
});

export default router;
