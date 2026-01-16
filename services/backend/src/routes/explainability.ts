import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import axios from 'axios';

const router = express.Router();
router.use(authenticate);

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/v1/explainability/shap/waterfall
 * Generate SHAP waterfall plot for a prediction
 * 
 * Body:
 * {
 *   batterySystemId: string,
 *   features: Record<string, number>,
 *   predictionValue: number,
 *   predictionType: 'RUL' | 'anomaly' | 'risk'
 * }
 */
router.post('/shap/waterfall', async (req: AuthRequest, res: Response) => {
  try {
    const {
      batterySystemId,
      features,
      predictionValue,
      predictionType = 'RUL'
    } = req.body;

    // Validation
    if (!batterySystemId || !features || predictionValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: batterySystemId, features, predictionValue'
      });
    }

    // Call ML service for SHAP explanation
    const response = await axios.post(
      `${ML_SERVICE_URL}/explain/waterfall`,
      {
        battery_system_id: batterySystemId,
        features,
        prediction_value: predictionValue,
        prediction_type: predictionType
      },
      {
        timeout: 30000 // 30 second timeout
      }
    );

    res.json({
      data: response.data,
      batterySystemId,
      predictionType
    });

  } catch (error) {
    console.error('Error generating waterfall plot:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        error: 'ML service error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/explainability/shap/force
 * Generate SHAP force plot for a prediction
 * 
 * Body:
 * {
 *   batterySystemId: string,
 *   features: Record<string, number>,
 *   predictionValue: number,
 *   predictionType: 'RUL' | 'anomaly' | 'risk'
 * }
 */
router.post('/shap/force', async (req: AuthRequest, res: Response) => {
  try {
    const {
      batterySystemId,
      features,
      predictionValue,
      predictionType = 'RUL'
    } = req.body;

    // Validation
    if (!batterySystemId || !features || predictionValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: batterySystemId, features, predictionValue'
      });
    }

    // Call ML service for SHAP force plot
    const response = await axios.post(
      `${ML_SERVICE_URL}/explain/force`,
      {
        battery_system_id: batterySystemId,
        features,
        prediction_value: predictionValue,
        prediction_type: predictionType
      },
      {
        timeout: 30000
      }
    );

    res.json({
      data: response.data,
      batterySystemId,
      predictionType
    });

  } catch (error) {
    console.error('Error generating force plot:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        error: 'ML service error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/explainability/explanation
 * Generate natural language explanation for a prediction
 * 
 * Body:
 * {
 *   batterySystemId: string,
 *   features: Record<string, number>,
 *   predictionValue: number,
 *   predictionType: 'RUL' | 'anomaly' | 'risk',
 *   topN?: number
 * }
 */
router.post('/explanation', async (req: AuthRequest, res: Response) => {
  try {
    const {
      batterySystemId,
      features,
      predictionValue,
      predictionType = 'RUL',
      topN = 5
    } = req.body;

    // Validation
    if (!batterySystemId || !features || predictionValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: batterySystemId, features, predictionValue'
      });
    }

    // Call ML service for explanation
    const response = await axios.post(
      `${ML_SERVICE_URL}/explain/text`,
      {
        battery_system_id: batterySystemId,
        features,
        prediction_value: predictionValue,
        prediction_type: predictionType,
        top_n: topN
      },
      {
        timeout: 30000
      }
    );

    res.json({
      data: {
        explanation: response.data.explanation,
        topFeatures: response.data.top_features,
        baseValue: response.data.base_value,
        predictionValue: response.data.prediction_value
      },
      batterySystemId,
      predictionType
    });

  } catch (error) {
    console.error('Error generating explanation:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        error: 'ML service error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/explainability/export
 * Export complete explanation report (plots + text)
 * 
 * Body:
 * {
 *   batterySystemId: string,
 *   features: Record<string, number>,
 *   predictionValue: number,
 *   predictionType: 'RUL' | 'anomaly' | 'risk'
 * }
 */
router.post('/export', async (req: AuthRequest, res: Response) => {
  try {
    const {
      batterySystemId,
      features,
      predictionValue,
      predictionType = 'RUL'
    } = req.body;

    // Validation
    if (!batterySystemId || !features || predictionValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: batterySystemId, features, predictionValue'
      });
    }

    // Call ML service to generate report
    const response = await axios.post(
      `${ML_SERVICE_URL}/explain/export`,
      {
        battery_system_id: batterySystemId,
        features,
        prediction_value: predictionValue,
        prediction_type: predictionType
      },
      {
        timeout: 60000 // 60 second timeout for report generation
      }
    );

    res.json({
      data: {
        waterfallPlot: response.data.waterfall_plot,
        forcePlot: response.data.force_plot,
        explanationText: response.data.explanation_text,
        outputDirectory: response.data.output_directory
      },
      batterySystemId,
      predictionType,
      message: 'Explanation report generated successfully'
    });

  } catch (error) {
    console.error('Error exporting explanation report:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        error: 'ML service error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/explainability/prediction/:predictionId/explain
 * Get explanation for an existing prediction
 * 
 * This endpoint fetches a stored prediction and generates SHAP explanation
 */
router.get('/prediction/:predictionId/explain', async (req: AuthRequest, res: Response) => {
  try {
    const { predictionId } = req.params;
    const { type = 'waterfall' } = req.query; // 'waterfall', 'force', or 'text'

    // Fetch prediction from database (RUL prediction example)
    const { pool } = await import('../config/database.js');
    const result = await pool.query(
      `SELECT 
        id,
        battery_system_id,
        predicted_rul,
        confidence,
        features,
        model_version
      FROM rul_predictions
      WHERE id = $1`,
      [predictionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const prediction = result.rows[0];

    // Generate explanation based on type
    let explanationData;
    
    if (type === 'waterfall') {
      const response = await axios.post(
        `${ML_SERVICE_URL}/explain/waterfall`,
        {
          battery_system_id: prediction.battery_system_id,
          features: prediction.features,
          prediction_value: prediction.predicted_rul,
          prediction_type: 'RUL'
        }
      );
      explanationData = response.data;
      
    } else if (type === 'force') {
      const response = await axios.post(
        `${ML_SERVICE_URL}/explain/force`,
        {
          battery_system_id: prediction.battery_system_id,
          features: prediction.features,
          prediction_value: prediction.predicted_rul,
          prediction_type: 'RUL'
        }
      );
      explanationData = response.data;
      
    } else if (type === 'text') {
      const response = await axios.post(
        `${ML_SERVICE_URL}/explain/text`,
        {
          battery_system_id: prediction.battery_system_id,
          features: prediction.features,
          prediction_value: prediction.predicted_rul,
          prediction_type: 'RUL',
          top_n: 5
        }
      );
      explanationData = response.data;
      
    } else {
      return res.status(400).json({
        error: 'Invalid type parameter. Must be: waterfall, force, or text'
      });
    }

    res.json({
      prediction: {
        id: prediction.id,
        batterySystemId: prediction.battery_system_id,
        predictedRUL: prediction.predicted_rul,
        confidence: prediction.confidence,
        modelVersion: prediction.model_version
      },
      explanation: explanationData,
      type
    });

  } catch (error) {
    console.error('Error getting prediction explanation:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({
        error: 'ML service error',
        details: error.response.data
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
