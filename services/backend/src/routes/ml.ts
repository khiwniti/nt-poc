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
import { authenticate, AuthRequest } from '../middleware/auth';
import { getModel, initializeModel } from '../ml/predictiveMaintenanceModel';
import {
  createBatchPredictionJob,
  DEFAULT_ASYNC_THRESHOLD,
  getBatchPredictionJob,
  getFacilityBatterySystemIds,
  MAX_BATTERIES_PER_REQUEST,
  normalizeBatterySystemIds,
  runBatchPrediction,
  startBatchPredictionJob,
} from '../services/batchPredictionService';
import type {
  PredictMaintenanceRequest,
  PredictMaintenanceResponse,
  TrainingData,
} from '../types/predictiveMaintenance';

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
      rocAuc: metrics
        ? {
            '7d': metrics.rocAuc7d,
            '14d': metrics.rocAuc14d,
            '30d': metrics.rocAuc30d,
          }
        : undefined,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to make prediction' });
  }
});

/**
 * POST /api/v1/ml/predict-batch
 * Predict maintenance risk for multiple battery systems in one request.
 *
 * Request body supported shapes:
 * - ["battery-id-1", "battery-id-2"]
 * - { batterySystemIds: ["..."], facilityId?: "...", async?: boolean, concurrency?: number }
 */
router.post('/predict-batch', async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as unknown;

    let batterySystemIds: string[] = [];
    let facilityId: string | null = null;
    let asyncRequested = false;
    let concurrency: number | undefined;

    if (Array.isArray(body)) {
      const parsed = normalizeBatterySystemIds(body);
      if (!parsed) {
        return res.status(400).json({ error: 'Request body must be an array of battery IDs' });
      }
      batterySystemIds = parsed;
    } else if (body && typeof body === 'object') {
      const bodyObj = body as Record<string, unknown>;
      const parsed = normalizeBatterySystemIds(bodyObj.batterySystemIds ?? bodyObj.batteryIds);
      if (parsed) batterySystemIds = parsed;

      if (typeof bodyObj.facilityId === 'string' && bodyObj.facilityId.trim()) {
        facilityId = bodyObj.facilityId.trim();
      }

      asyncRequested = bodyObj.async === true;

      if (typeof bodyObj.concurrency === 'number' && Number.isFinite(bodyObj.concurrency)) {
        concurrency = bodyObj.concurrency;
      }
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    if (facilityId) {
      try {
        const facilityBatteryIds = await getFacilityBatterySystemIds(facilityId);
        batterySystemIds =
          normalizeBatterySystemIds([...batterySystemIds, ...facilityBatteryIds]) || [];
      } catch (error) {
        if (error instanceof Error && error.message.includes('exceeds max')) {
          return res.status(400).json({ error: error.message });
        }
        console.error('Facility batch resolution error:', error);
        return res.status(500).json({ error: 'Failed to resolve facility batteries' });
      }
    }

    if (batterySystemIds.length === 0) {
      return res.status(400).json({ error: 'batterySystemIds is required' });
    }

    if (batterySystemIds.length > MAX_BATTERIES_PER_REQUEST) {
      return res.status(400).json({ error: `max ${MAX_BATTERIES_PER_REQUEST} batteries/request` });
    }

    const shouldAsync = asyncRequested || batterySystemIds.length > DEFAULT_ASYNC_THRESHOLD;
    if (shouldAsync) {
      const job = createBatchPredictionJob(batterySystemIds);
      startBatchPredictionJob(job.jobId, batterySystemIds, { concurrency });

      return res.status(202).json({
        jobId: job.jobId,
        status: job.status,
        total: job.total,
        statusUrl: `/api/v1/ml/predict-batch/${job.jobId}`,
      });
    }

    const result = await runBatchPrediction(batterySystemIds, { concurrency });
    res.json(result);
  } catch (error: any) {
    console.error('Batch prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to make batch predictions' });
  }
});

/**
 * GET /api/v1/ml/predict-batch/:jobId
 * Get status/results for an async batch prediction job.
 */
router.get('/predict-batch/:jobId', async (req: AuthRequest, res: Response) => {
  const jobId = req.params.jobId;
  const job = getBatchPredictionJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const payload = {
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    total: job.total,
    successful: job.successful,
    failed: job.failed,
    predictions: job.predictions,
    error: job.error,
  };

  if (job.status === 'completed') return res.status(200).json(payload);
  if (job.status === 'failed') return res.status(500).json(payload);
  return res.status(202).json(payload);
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
