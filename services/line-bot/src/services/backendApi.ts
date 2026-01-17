import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

interface FacilityHealth {
  id: string;
  name: string;
  location: string;
  health: {
    status: string;
    score: number;
  };
  latitude?: number;
  longitude?: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  status: string;
  message: string;
  batterySystemId: string;
  zoneId?: string;
  facilityId?: string;
  createdAt: number;
}

interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

interface Prediction {
  id: string;
  batterySystemId: string;
  predictedRUL: number;
  confidence: number;
  predictionDate: string;
  modelVersion: string;
}

export class BackendApiService {
  private client: AxiosInstance;
  private baseUrl: string;
  private jwtSecret: string;

  constructor() {
    this.baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
    this.jwtSecret = process.env.JWT_SECRET || 'test-secret';
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication and logging
    this.client.interceptors.request.use(
      (config) => {
        // Generate JWT token for service-to-service authentication
        const token = this.generateServiceToken();
        config.headers.Authorization = `Bearer ${token}`;
        
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          logger.error(`API Error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
        } else if (error.request) {
          logger.error('API Network Error: No response received');
        } else {
          logger.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate JWT token for service-to-service authentication
   */
  private generateServiceToken(): string {
    const payload = {
      userId: 'line-bot-service',
      role: 'service',
      service: 'line-bot',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '1h',
    });
  }

  /**
   * Get all facilities with health status
   */
  async getFacilities(): Promise<FacilityHealth[]> {
    try {
      const response = await this.client.get('/facilities/map');
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching facilities:', error);
      return [];
    }
  }

  /**
   * Get a specific facility by ID
   */
  async getFacility(facilityId: string): Promise<FacilityHealth | null> {
    try {
      const response = await this.client.get(`/facilities/${facilityId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching facility ${facilityId}:`, error);
      return null;
    }
  }

  /**
   * Get KPIs for a facility
   */
  async getFacilityKpis(facilityId: string): Promise<any> {
    try {
      const response = await this.client.get(`/facilities/${facilityId}/kpis`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching facility KPIs for ${facilityId}:`, error);
      return null;
    }
  }

  /**
   * Get alert summary
   */
  async getAlertSummary(): Promise<AlertSummary> {
    try {
      const response = await this.client.get('/alerts/summary');
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching alert summary:', error);
      return { critical: 0, warning: 0, info: 0, total: 0 };
    }
  }

  /**
   * Get recent alerts with filters
   */
  async getAlerts(params?: {
    severity?: string;
    status?: string;
    limit?: number;
  }): Promise<Alert[]> {
    try {
      const response = await this.client.get('/alerts', { params });
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Get specific alert by ID
   */
  async getAlert(alertId: string): Promise<Alert | null> {
    try {
      const response = await this.client.get(`/alerts/${alertId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching alert ${alertId}:`, error);
      return null;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      await this.client.post(`/alerts/${alertId}/acknowledge`);
      return true;
    } catch (error) {
      logger.error(`Error acknowledging alert ${alertId}:`, error);
      return false;
    }
  }

  /**
   * Get latest RUL prediction for a battery system
   */
  async getLatestPrediction(batteryId: string): Promise<Prediction | null> {
    try {
      const response = await this.client.get(`/predictions/${batteryId}/latest`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching prediction for battery ${batteryId}:`, error);
      return null;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{ status: string; services: any[] }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Error fetching system health:', error);
      return { status: 'unknown', services: [] };
    }
  }

  /**
   * Search facilities by name or location
   */
  async searchFacilities(query: string): Promise<FacilityHealth[]> {
    try {
      const facilities = await this.getFacilities();
      const lowerQuery = query.toLowerCase();
      return facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.location.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      logger.error('Error searching facilities:', error);
      return [];
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(params?: {
    timeRange?: string;
    batteryId?: string;
    zoneId?: string;
  }): Promise<any> {
    try {
      const response = await this.client.get('/alerts/stats/summary', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching alert stats:', error);
      return null;
    }
  }
}

export default new BackendApiService();
