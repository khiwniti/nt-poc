import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import type {
  ScenarioParameters,
  ScenarioPrediction,
  SavedScenario,
  SavedScenarioRow,
} from '../types/whatIfScenario.js';

const router = express.Router();

router.use(authenticate);

/**
 * Convert database row to API response format
 */
function mapRowToScenario(row: SavedScenarioRow): SavedScenario {
  return {
    id: row.id,
    batterySystemId: row.battery_system_id,
    name: row.name,
    description: row.description || undefined,
    parameters: row.parameters,
    prediction: row.prediction,
    createdAt: row.created_at,
  };
}

/**
 * Simulate RUL and health score based on operating parameters
 * This is a simplified model - in production, this would call the ML service
 */
function simulatePrediction(
  baseRUL: number,
  baseHealth: number,
  currentParams: ScenarioParameters,
  newParams: ScenarioParameters
): ScenarioPrediction {
  // Temperature impact: higher temperature reduces RUL
  const tempDelta = (currentParams.temperature - newParams.temperature) * 0.5; // 0.5 days per degree
  
  // Load impact: higher load reduces RUL
  const loadDelta = (currentParams.loadPercentage - newParams.loadPercentage) * 0.3; // 0.3 days per %
  
  // Cycle frequency impact: more cycles reduce RUL
  const cycleDelta = (currentParams.cycleFrequency - newParams.cycleFrequency) * 5; // 5 days per cycle/day

  // Calculate new RUL
  const simulatedRUL = Math.max(0, baseRUL + tempDelta + loadDelta + cycleDelta);

  // Health score follows similar pattern (scaled to 0-100)
  const healthDelta = ((tempDelta + loadDelta + cycleDelta) / baseRUL) * baseHealth;
  const simulatedHealth = Math.max(0, Math.min(100, baseHealth + healthDelta));

  // Confidence decreases slightly for more extreme parameter changes
  const parameterChange = 
    Math.abs(currentParams.temperature - newParams.temperature) / 60 +
    Math.abs(currentParams.loadPercentage - newParams.loadPercentage) / 100 +
    Math.abs(currentParams.cycleFrequency - newParams.cycleFrequency) / 10;
  
  const confidence = Math.max(0.5, 0.95 - (parameterChange * 0.1));

  return {
    rul: simulatedRUL,
    healthScore: simulatedHealth,
    confidence,
    parameters: newParams,
  };
}

/**
 * POST /api/v1/what-if/simulate
 * Simulate a what-if scenario with different operating parameters
 */
router.post('/simulate', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId, parameters } = req.body as {
      batterySystemId: string;
      parameters: ScenarioParameters;
    };

    if (!batterySystemId || !parameters) {
      return res.status(400).json({ error: 'Missing batterySystemId or parameters' });
    }

    // Validate parameters
    if (
      parameters.temperature < 0 || parameters.temperature > 60 ||
      parameters.loadPercentage < 0 || parameters.loadPercentage > 100 ||
      parameters.cycleFrequency < 0 || parameters.cycleFrequency > 10
    ) {
      return res.status(400).json({ error: 'Invalid parameter values' });
    }

    // Get latest prediction for the battery system
    const latestPrediction = await pool.query(
      `SELECT
        predicted_rul,
        confidence,
        features
      FROM rul_predictions
      WHERE battery_system_id = $1
      ORDER BY prediction_date DESC
      LIMIT 1`,
      [batterySystemId]
    );

    if (latestPrediction.rows.length === 0) {
      return res.status(404).json({ error: 'No predictions found for this battery system' });
    }

    const baseRUL = latestPrediction.rows[0].predicted_rul;
    const features = latestPrediction.rows[0].features || {};
    
    // Extract current operating parameters from features
    const currentParams: ScenarioParameters = {
      temperature: features.temperature || 25,
      loadPercentage: features.load_percentage || 50,
      cycleFrequency: features.cycle_frequency || 1,
    };

    // Calculate base health score (simplified: RUL normalized to 0-100 scale)
    const baseHealth = Math.min(100, (baseRUL / 365) * 100);

    // Simulate the new scenario
    const prediction = simulatePrediction(baseRUL, baseHealth, currentParams, parameters);

    res.json(prediction);
  } catch (error) {
    console.error('Error simulating scenario:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/what-if/current/:batteryId
 * Get current operating state and prediction for a battery system
 */
router.get('/current/:batteryId', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId } = req.params;

    // Get latest prediction
    const result = await pool.query(
      `SELECT
        predicted_rul,
        confidence,
        features
      FROM rul_predictions
      WHERE battery_system_id = $1
      ORDER BY prediction_date DESC
      LIMIT 1`,
      [batteryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No predictions found for this battery system' });
    }

    const row = result.rows[0];
    const features = row.features || {};
    
    const parameters: ScenarioParameters = {
      temperature: features.temperature || 25,
      loadPercentage: features.load_percentage || 50,
      cycleFrequency: features.cycle_frequency || 1,
    };

    const rul = row.predicted_rul;
    const healthScore = Math.min(100, (rul / 365) * 100);

    const prediction: ScenarioPrediction = {
      rul,
      healthScore,
      confidence: Number(row.confidence),
      parameters,
    };

    res.json(prediction);
  } catch (error) {
    console.error('Error fetching current prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/what-if/scenarios
 * Save a what-if scenario
 */
router.post('/scenarios', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId, name, description, parameters, prediction } = req.body;

    if (!batterySystemId || !name || !parameters || !prediction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query<SavedScenarioRow>(
      `INSERT INTO what_if_scenarios (
        battery_system_id,
        name,
        description,
        parameters,
        prediction
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        batterySystemId,
        name,
        description || null,
        JSON.stringify(parameters),
        JSON.stringify(prediction),
      ]
    );

    const scenario = mapRowToScenario(result.rows[0]);
    res.status(201).json(scenario);
  } catch (error) {
    console.error('Error saving scenario:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/what-if/scenarios/:batteryId
 * Get all saved scenarios for a battery system
 */
router.get('/scenarios/:batteryId', async (req: AuthRequest, res: Response) => {
  try {
    const { batteryId } = req.params;

    const result = await pool.query<SavedScenarioRow>(
      `SELECT *
      FROM what_if_scenarios
      WHERE battery_system_id = $1
      ORDER BY created_at DESC`,
      [batteryId]
    );

    const scenarios = result.rows.map(mapRowToScenario);
    res.json({ data: scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/what-if/scenarios/:scenarioId
 * Delete a saved scenario
 */
router.delete('/scenarios/:scenarioId', async (req: AuthRequest, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const result = await pool.query(
      'DELETE FROM what_if_scenarios WHERE id = $1 RETURNING id',
      [scenarioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
