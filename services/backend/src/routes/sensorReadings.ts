import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/latest', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId } = req.query;

    if (!batterySystemId) {
      return res.status(400).json({ error: 'batterySystemId parameter is required' });
    }

    const result = await pool.query(
      `SELECT
        battery_system_id as "batterySystemId",
        time,
        voltage,
        current,
        temperature,
        soc,
        soh,
        power
       FROM sensor_readings
       WHERE battery_system_id = $1
       ORDER BY time DESC
       LIMIT 1`,
      [batterySystemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No readings found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/battery/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const { id: batterySystemId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = parseInt(req.query.limit as string) || 50;

    // Calculate start time based on hours parameter
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const result = await pool.query(
      `SELECT
        time,
        battery_system_id,
        voltage,
        current,
        temperature,
        soc,
        soh,
        power
       FROM sensor_readings
       WHERE battery_system_id = $1
         AND time >= $2::timestamptz
       ORDER BY time ASC
       LIMIT $3`,
      [batterySystemId, startTime.toISOString(), limit]
    );

    res.json({
      data: result.rows,
      total: result.rowCount || 0,
      hours: hours,
      limit: limit,
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/timeseries', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId, startTime, endTime, interval = 'raw' } = req.query;

    if (!batterySystemId || !startTime || !endTime) {
      return res.status(400).json({
        error: 'batterySystemId, startTime, and endTime parameters are required',
      });
    }

    let query: string;

    if (interval === 'hourly') {
      query = `
        SELECT
          time_bucket('1 hour', time) as time,
          AVG(voltage) as avg_voltage,
          AVG(current) as avg_current,
          AVG(temperature) as avg_temperature,
          AVG(soc) as avg_soc,
          AVG(soh) as avg_soh,
          AVG(power) as avg_power
        FROM sensor_readings
        WHERE battery_system_id = $1
          AND time >= $2::timestamptz
          AND time <= $3::timestamptz
        GROUP BY time_bucket('1 hour', time)
        ORDER BY time DESC
      `;
    } else {
      query = `
        SELECT
          time,
          voltage,
          current,
          temperature,
          soc,
          soh,
          power
        FROM sensor_readings
        WHERE battery_system_id = $1
          AND time >= $2::timestamptz
          AND time <= $3::timestamptz
        ORDER BY time DESC
      `;
    }

    const result = await pool.query(query, [batterySystemId, startTime, endTime]);

    res.json({
      data: result.rows,
      total: result.rowCount || 0,
      interval: interval,
    });
  } catch (error) {
    console.error('Error fetching timeseries data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
