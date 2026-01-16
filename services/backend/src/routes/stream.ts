import express, { Request, Response } from 'express';
import alertRealtimeService from '../services/alertRealtimeService';

const router = express.Router();

function parseCsvParam(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

// GET /api/v1/stream/alerts - Server-Sent Events stream for real-time alerts
router.get('/alerts', async (req: Request, res: Response) => {
  const facilityIds = parseCsvParam((req.query.facilityId ?? req.query.facility_id) as unknown);
  const zoneIds = parseCsvParam((req.query.zoneId ?? req.query.zone_id) as unknown);

  alertRealtimeService.subscribe(req, res, { facilityIds, zoneIds });
});

export default router;

