/**
 * ML Predictive Maintenance API Routes
 * T140: Implement predictive maintenance model
 * 
 * Endpoints:
 * - POST /api/v1/ml/predict-maintenance - Predict maintenance risk
 * - GET /api/v1/ml/model-metrics - Get model performance metrics
 * - POST /api/v1/ml/train - Train/retrain the model
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getModel, initializeModel } from '../ml/predictiveMaintenanceModel.js';
import type {
  PredictMaintenanceRequest,
  PredictMaintenanceResponse,
  TrainingData,
} from '../types/predictiveMaintenance.js';

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/v1/ml/predict-maintenance
 * Predict probability of failure within 7, 14, 30 days
 */
router.post('/predict-maintenance', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId, features } = req.body as PredictMaintenanceRequest;

    // Validate required fields
    if (!batterySystemId) {
      return res.status(400).json({ error: 'batterySystemId is required' });
    }

    if (!features) {
      return res.status(400).json({ error: 'features is required' });
    }

    // Validate feature fields
    const { sohDelta, anomalyCount, tempMax, voltageMin } = features;
    if (
      typeof sohDelta !== 'number' ||
      typeof anomalyCount !== 'number' ||
      typeof tempMax !== 'number' ||
      typeof voltageMin !== 'number'
    ) {
      return res.status(400).json({
        error: 'All features must be numbers: sohDelta, anomalyCount, tempMax, voltageMin',
      });
    }

    // Validate feature ranges
    if (anomalyCount < 0) {
      return res.status(400).json({ error: 'anomalyCount must be non-negative' });
    }

    const model = getModel();

    // Ensure model is trained
    if (!model.isTrained()) {
      await initializeModel();
    }

    // Make prediction
    const prediction = await model.predict(batterySystemId, features);

    // Get model metrics for AUC-ROC values
    const metrics = model.getMetrics();
    
    const response: PredictMaintenanceResponse = {
      prediction,
      rocAuc: metrics ? {
        '7d': metrics.rocAuc7d,
        '14d': metrics.rocAuc14d,
        '30d': metrics.rocAuc30d,
      } : undefined,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to make prediction' });
  }
});

/**
 * GET /api/v1/ml/model-metrics
 * Get current model performance metrics
 */
router.get('/model-metrics', async (req: AuthRequest, res: Response) => {
  try {
    const model = getModel();

    if (!model.isTrained()) {
      return res.status(404).json({ error: 'Model not trained yet' });
    }

    const metrics = model.getMetrics();
    res.json({
      metrics,
      modelVersion: model.getModelVersion(),
    });
  } catch (error: any) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: error.message || 'Failed to get metrics' });
  }
});

/**
 * POST /api/v1/ml/train
 * Train or retrain the model with custom training data
 */
router.post('/train', async (req: AuthRequest, res: Response) => {
  try {
    const { trainingData } = req.body as { trainingData?: TrainingData[] };

    await initializeModel(trainingData);

    const model = getModel();
    const metrics = model.getMetrics();

    res.json({
      success: true,
      modelVersion: model.getModelVersion(),
      metrics,
    });
  } catch (error: any) {
    console.error('Training error:', error);
    res.status(500).json({ error: error.message || 'Failed to train model' });
  }
});

export default router;
