/**
 * Sensor Data Ingestion Service
 * Fetches data from simulator service and stores in TimescaleDB
 */

import { pool } from '../config/database.js';
import { logger } from '../observability/logger.js';
import axios from 'axios';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8001';
const INGESTION_INTERVAL_MS = parseInt(process.env.SENSOR_INGESTION_INTERVAL || '10000'); // 10 seconds default
const ENABLED = process.env.SENSOR_INGESTION_ENABLED !== 'false'; // Enabled by default

interface SensorReading {
  battery_system_id: string;
  voltage: number;
  current: number;
  temperature: number;
  soc: number;
  soh: number;
  power: number;
  timestamp: string;
}

class SensorIngestionService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the ingestion service
   */
  async start() {
    if (!ENABLED) {
      logger.info('sensor_ingestion_disabled');
      return;
    }

    if (this.isRunning) {
      logger.warn('sensor_ingestion_already_running');
      return;
    }

    logger.info('sensor_ingestion_starting', {
      simulatorUrl: SIMULATOR_URL,
      intervalMs: INGESTION_INTERVAL_MS,
    });

    // Check if simulator is accessible
    const isAccessible = await this.checkSimulatorHealth();
    if (!isAccessible) {
      logger.error('sensor_ingestion_simulator_not_accessible', {
        url: SIMULATOR_URL,
      });
      logger.warn('sensor_ingestion_will_retry_on_interval');
    }

    this.isRunning = true;
    
    // Run immediately on start
    await this.ingestData();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.ingestData().catch((error) => {
        logger.error('sensor_ingestion_interval_error', {
          error: error.message,
        });
      });
    }, INGESTION_INTERVAL_MS);

    logger.info('sensor_ingestion_started');
  }

  /**
   * Stop the ingestion service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('sensor_ingestion_stopped');
  }

  /**
   * Check if simulator service is healthy
   */
  private async checkSimulatorHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${SIMULATOR_URL}/api/health`, {
        timeout: 3000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch all battery systems that need sensor data
   */
  private async getBatterySystems(): Promise<string[]> {
    try {
      const result = await pool.query(`
        SELECT id FROM battery_systems
        WHERE status != 'inactive'
        ORDER BY id
      `);
      return result.rows.map((row) => row.id);
    } catch (error) {
      logger.error('sensor_ingestion_get_batteries_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Fetch sensor reading from simulator for a specific battery system
   */
  private async fetchSensorReading(batterySystemId: string): Promise<SensorReading | null> {
    try {
      const response = await axios.get(
        `${SIMULATOR_URL}/api/sensors/reading/${batterySystemId}`,
        { timeout: 5000 }
      );
      
      if (response.data) {
        return {
          battery_system_id: batterySystemId,
          voltage: response.data.voltage,
          current: response.data.current,
          temperature: response.data.temperature,
          soc: response.data.soc,
          soh: response.data.soh,
          power: response.data.power,
          timestamp: response.data.timestamp || new Date().toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          logger.debug('sensor_ingestion_simulator_not_available', {
            batterySystemId,
          });
        } else {
          logger.warn('sensor_ingestion_fetch_failed', {
            batterySystemId,
            error: error.message,
          });
        }
      }
      return null;
    }
  }

  /**
   * Store sensor reading in TimescaleDB
   */
  private async storeSensorReading(reading: SensorReading): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO sensor_readings (
          battery_system_id,
          time,
          voltage,
          current,
          temperature,
          soc,
          soh,
          power
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          reading.battery_system_id,
          reading.timestamp,
          reading.voltage,
          reading.current,
          reading.temperature,
          reading.soc,
          reading.soh,
          reading.power,
        ]
      );
      return true;
    } catch (error) {
      logger.error('sensor_ingestion_store_failed', {
        batterySystemId: reading.battery_system_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Main ingestion logic
   */
  private async ingestData() {
    const startTime = Date.now();
    logger.debug('sensor_ingestion_run_started');

    try {
      // Get all battery systems
      const batterySystems = await this.getBatterySystems();
      
      if (batterySystems.length === 0) {
        logger.debug('sensor_ingestion_no_batteries');
        return;
      }

      logger.debug('sensor_ingestion_fetching', {
        count: batterySystems.length,
      });

      // Fetch readings for all batteries
      const readingPromises = batterySystems.map((id) => 
        this.fetchSensorReading(id)
      );
      
      const readings = await Promise.all(readingPromises);
      const validReadings = readings.filter((r): r is SensorReading => r !== null);

      if (validReadings.length === 0) {
        logger.debug('sensor_ingestion_no_valid_readings');
        return;
      }

      // Store all readings
      const storePromises = validReadings.map((reading) =>
        this.storeSensorReading(reading)
      );
      
      const results = await Promise.all(storePromises);
      const successCount = results.filter((r) => r).length;

      const duration = Date.now() - startTime;

      logger.info('sensor_ingestion_run_completed', {
        fetched: validReadings.length,
        stored: successCount,
        failed: validReadings.length - successCount,
        durationMs: duration,
      });
    } catch (error) {
      logger.error('sensor_ingestion_run_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Singleton instance
const sensorIngestionService = new SensorIngestionService();

export default sensorIngestionService;
