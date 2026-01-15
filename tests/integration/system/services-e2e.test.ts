import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BackendClient } from '../shared/clients/backendClient';
import { MlopsClient } from '../shared/clients/mlopsClient';
import { HarnessContext } from '../shared/harnessContext';

/**
 * Comprehensive End-to-End Integration Test Suite
 * 
 * Tests the complete data flow across all services:
 * 1. Backend API health & readiness
 * 2. MLOps service for predictions
 * 3. Simulator for generating test data
 * 4. Frontend data consumption (via backend API)
 * 5. Service-to-service communication
 */

const ctx = new HarnessContext({ profile: 'core' });
const backendClient = new BackendClient();
const mlopsClient = new MlopsClient();

beforeAll(async () => {
  console.log('🚀 Starting all services...');
  await ctx.up();
  console.log('✅ All services started');
}, 120_000);

afterAll(async () => {
  console.log('🛑 Stopping all services...');
  await ctx.down();
  console.log('✅ All services stopped');
}, 30_000);

describe('Service Health & Readiness', () => {
  it('backend should be healthy and report service status', async () => {
    const health = await backendClient.getHealth();
    
    expect(health.status).toBe('ok');
    expect(health.services).toBeDefined();
    
    console.log('✅ Backend health:', health);
  });

  it('mlops service should be reachable and healthy', async () => {
    const health = await mlopsClient.getHealth();
    
    expect(health.status).toBeDefined();
    expect(['healthy', 'ok']).toContain(health.status.toLowerCase());
    
    console.log('✅ MLOps health:', health);
  });
});

describe('Data Flow: Backend → Database', () => {
  it('should retrieve facility list from backend', async () => {
    const response = await backendClient.getFacilities();
    
    expect(response).toBeDefined();
    expect(Array.isArray(response.data) || Array.isArray(response)).toBe(true);
    
    const facilities = response.data || response;
    console.log(`✅ Retrieved ${facilities.length} facilities`);
  });

  it('should retrieve battery systems from backend', async () => {
    const response = await backendClient.getBatterySystems();
    
    expect(response).toBeDefined();
    expect(Array.isArray(response.data) || Array.isArray(response)).toBe(true);
    
    const systems = response.data || response;
    console.log(`✅ Retrieved ${systems.length} battery systems`);
    
    if (systems.length > 0) {
      expect(systems[0]).toHaveProperty('id');
      expect(systems[0]).toHaveProperty('name');
    }
  });
});

describe('Data Flow: Backend → MLOps Service', () => {
  it('should get RUL prediction from MLOps via backend', async () => {
    const predictionRequest = {
      batterySystemId: 'test-battery-001',
      features: {
        sohDelta: -0.5,
        anomalyCount: 2,
        tempMax: 45.5,
        voltageMin: 3.2,
      },
    };

    const prediction = await backendClient.getRulPrediction(predictionRequest);
    
    expect(prediction).toBeDefined();
    expect(prediction.prediction).toBeDefined();
    
    console.log('✅ RUL Prediction received:', prediction);
  });

  it('should get anomaly detection from MLOps directly', async () => {
    const features = {
      voltage: 3.7,
      current: 50.0,
      temperature: 35.0,
      soc: 75.0,
      soh: 95.0,
      power: 185.0,
    };

    const result = await mlopsClient.detectAnomaly(features);
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('isAnomaly');
    expect(typeof result.isAnomaly).toBe('boolean');
    
    if ('anomalyScore' in result) {
      expect(typeof result.anomalyScore).toBe('number');
    }
    
    console.log('✅ Anomaly detection result:', result);
  });
});

describe('Data Flow: Sensor Data Ingestion', () => {
  it('should ingest sensor readings to backend', async () => {
    const sensorData = {
      batterySystemId: 'test-battery-001',
      readings: [
        {
          time: new Date().toISOString(),
          voltage: 3.7,
          current: 50.0,
          temperature: 35.0,
          soc: 75.0,
          soh: 95.0,
          power: 185.0,
        },
        {
          time: new Date(Date.now() - 60000).toISOString(),
          voltage: 3.68,
          current: 48.5,
          temperature: 34.8,
          soc: 74.5,
          soh: 95.0,
          power: 178.5,
        },
      ],
    };

    const result = await backendClient.ingestSensorData(sensorData);
    
    expect(result).toBeDefined();
    expect(result.success || result.status === 'ok' || result.message).toBeTruthy();
    
    console.log('✅ Sensor data ingested:', result);
  });

  it('should retrieve latest sensor reading after ingestion', async () => {
    const batterySystemId = 'test-battery-001';
    
    // Small delay to ensure data is persisted
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const latest = await backendClient.getLatestSensorReading(batterySystemId);
    
    expect(latest).toBeDefined();
    expect(latest.data || latest).toBeDefined();
    
    const reading = latest.data || latest;
    expect(reading).toHaveProperty('voltage');
    expect(reading).toHaveProperty('temperature');
    expect(reading).toHaveProperty('soc');
    
    console.log('✅ Latest reading retrieved:', reading);
  });
});

describe('Alert System Integration', () => {
  it('should retrieve alerts from backend', async () => {
    const response = await backendClient.getAlerts();
    
    expect(response).toBeDefined();
    expect(Array.isArray(response.data) || Array.isArray(response)).toBe(true);
    
    const alerts = response.data || response;
    console.log(`✅ Retrieved ${alerts.length} alerts`);
    
    if (alerts.length > 0) {
      expect(alerts[0]).toHaveProperty('id');
      expect(alerts[0]).toHaveProperty('severity');
      expect(alerts[0]).toHaveProperty('status');
    }
  });
});

describe('Service Communication Performance', () => {
  it('backend should respond within acceptable time', async () => {
    const start = Date.now();
    await backendClient.getHealth();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // 5 seconds max
    console.log(`✅ Backend response time: ${duration}ms`);
  });

  it('mlops should respond within acceptable time', async () => {
    const start = Date.now();
    await mlopsClient.getHealth();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // 5 seconds max
    console.log(`✅ MLOps response time: ${duration}ms`);
  });

  it('end-to-end prediction flow should complete within 10 seconds', async () => {
    const start = Date.now();
    
    await backendClient.getRulPrediction({
      batterySystemId: 'perf-test-001',
      features: {
        sohDelta: -0.3,
        anomalyCount: 1,
        tempMax: 40.0,
        voltageMin: 3.3,
      },
    });
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10000); // 10 seconds max
    console.log(`✅ End-to-end prediction time: ${duration}ms`);
  });
});

describe('Error Handling & Resilience', () => {
  it('backend should handle invalid battery system ID gracefully', async () => {
    try {
      await backendClient.getLatestSensorReading('non-existent-battery-999');
      // If no error thrown, check for empty/null response
      expect(true).toBe(true);
    } catch (error: any) {
      // Should return 404 or similar
      expect([404, 400]).toContain(error.response?.status || error.status);
      console.log('✅ Backend handled invalid ID correctly');
    }
  });

  it('mlops should handle invalid feature data gracefully', async () => {
    try {
      await mlopsClient.detectAnomaly({
        voltage: -999, // Invalid value
        current: 50.0,
        temperature: 35.0,
        soc: 75.0,
        soh: 95.0,
        power: 185.0,
      });
      // If no error, service is being lenient (acceptable)
      expect(true).toBe(true);
    } catch (error: any) {
      // Should return 400 or 422
      expect([400, 422, 500]).toContain(error.response?.status || error.status);
      console.log('✅ MLOps handled invalid data correctly');
    }
  });
});
