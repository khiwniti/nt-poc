import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  geocodeAddress,
  reverseGeocode,
  getWeatherData,
  calculateDistance,
  getMapTileUrl,
} from '../services/geospatialService';
import { getMapCacheStats } from '../services/mapCache';

const router = express.Router();

router.use(authenticate);

router.post('/geocode', async (req: AuthRequest, res: Response) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await geocodeAddress(address);

    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reverse-geocode', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const result = await reverseGeocode(latitude, longitude);

    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/weather', async (req: AuthRequest, res: Response) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const result = await getWeatherData(latitude, longitude);

    if (!result) {
      return res.status(404).json({ error: 'Weather data not available' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/distance', async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, profile = 'driving' } = req.body;

    if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) {
      return res.status(400).json({ error: 'Valid from and to coordinates are required' });
    }

    if (!['driving', 'walking', 'cycling'].includes(profile)) {
      return res
        .status(400)
        .json({ error: 'Invalid profile. Must be driving, walking, or cycling' });
    }

    const result = await calculateDistance(from, to, profile);

    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tile-url', async (req: AuthRequest, res: Response) => {
  try {
    const z = parseInt(req.query.z as string);
    const x = parseInt(req.query.x as string);
    const y = parseInt(req.query.y as string);
    const style = (req.query.style as string) || 'streets-v11';

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return res.status(400).json({ error: 'Valid z, x, y tile coordinates are required' });
    }

    const url = getMapTileUrl(z, x, y, style);

    if (!url) {
      return res.status(503).json({ error: 'Map service not configured' });
    }

    res.json({ data: { url } });
  } catch (error) {
    console.error('Error getting tile URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/cache-stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = getMapCacheStats();
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
