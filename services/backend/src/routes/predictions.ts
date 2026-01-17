import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth';
import type {
  RULPrediction,
  RULPredictionRow,
  CreateRULPredictionRequest,
  RULPredictionResponse
} from '../types/rulPrediction';

const router = express.Router();

router.use(authenticate);

/**
 * Convert database row to API response format
 */
function mapRowToPrediction(row: RULPredictionRow): RULPrediction {
  return {
    id: row.id,
    batterySystemId: row.battery_system_id,
    predictedRUL: row.predicted_rul,
    confidence: Number(row.confidence),
    predictionDate: row.prediction_date,
    modelVersion: row.model_version,
    features: row.features,
    createdAt: row.created_at,
  };
}

/**
 * GET /api/v1/predictions/:batteryId
 * Get RUL predictions for a specific battery system
 * Returns historical predictions ordered by prediction date (newest first)
 */
router.get('/:batteryId', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Validate battery system exists
    const batteryCheck = await pool.query(
      'SELECT id FROM battery_systems WHERE id = $1',
      [batteryId]
    );

    if (batteryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Battery system not found' });
    }

    // Fetch predictions with pagination
    const result = await pool.query<RULPredictionRow>(
      `SELECT
        id,
        battery_system_id,
        predicted_rul,
        confidence,
        prediction_date,
        model_version,
        features,
        created_at
      FROM rul_predictions
      WHERE battery_system_id = $1
      ORDER BY prediction_date DESC
      LIMIT $2 OFFSET $3`,
      [batteryId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM rul_predictions WHERE battery_system_id = $1',
      [batteryId]
    );

    const predictions = result.rows.map(mapRowToPrediction);

    const response: RULPredictionResponse = {
      data: predictions,
      total: parseInt(countResult.rows[0].total),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching RUL predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/predictions/:batteryId/latest
 * Get the most recent RUL prediction for a battery system
 */
router.get('/:batteryId/latest', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId } = req.params;

    const result = await pool.query<RULPredictionRow>(
      `SELECT
        id,
        battery_system_id,
        predicted_rul,
        confidence,
        prediction_date,
        model_version,
        features,
        created_at
      FROM rul_predictions
      WHERE battery_system_id = $1
      ORDER BY prediction_date DESC
      LIMIT 1`,
      [batteryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No predictions found for this battery system' });
    }

    const prediction = mapRowToPrediction(result.rows[0]);

    const response: RULPredictionResponse = {
      data: prediction,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching latest RUL prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/predictions
 * Create a new RUL prediction
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      batterySystemId,
      predictedRUL,
      confidence,
      modelVersion,
      features,
    }: CreateRULPredictionRequest = req.body;

    // Validation
    if (!batterySystemId || predictedRUL === undefined || confidence === undefined || !modelVersion) {
      return res.status(400).json({
        error: 'Missing required fields: batterySystemId, predictedRUL, confidence, modelVersion',
      });
    }

    if (predictedRUL < 0) {
      return res.status(400).json({ error: 'predictedRUL must be non-negative' });
    }

    if (confidence < 0 || confidence > 1) {
      return res.status(400).json({ error: 'confidence must be between 0 and 1' });
    }

    // Verify battery system exists
    const batteryCheck = await pool.query(
      'SELECT id FROM battery_systems WHERE id = $1',
      [batterySystemId]
    );

    if (batteryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Battery system not found' });
    }

    // Insert prediction
    const result = await pool.query<RULPredictionRow>(
      `INSERT INTO rul_predictions (
        battery_system_id,
        predicted_rul,
        confidence,
        model_version,
        features
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        battery_system_id,
        predicted_rul,
        confidence,
        prediction_date,
        model_version,
        features,
        created_at`,
      [batterySystemId, predictedRUL, confidence, modelVersion, JSON.stringify(features || {})]
    );

    const prediction = mapRowToPrediction(result.rows[0]);

    const response: RULPredictionResponse = {
      data: prediction,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating RUL prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/predictions/cleanup
 * Manually trigger cleanup of old predictions (>90 days)
 * This is a maintenance endpoint, typically would be restricted to admin users
 */
router.delete('/cleanup', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM rul_predictions
       WHERE created_at < NOW() - INTERVAL '90 days'
       RETURNING id`
    );

    res.json({
      message: 'Cleanup completed',
      deletedCount: result.rowCount || 0,
    });
  } catch (error) {
    console.error('Error cleaning up old predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
