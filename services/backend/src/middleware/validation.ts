import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../config/logger.js';

// Validation middleware factory
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          path: req.path,
          method: req.method,
          errors: error.issues,
        });

        res.status(400).json({
          error: 'Validation failed',
          message: 'The request contains invalid data',
          details: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      } else {
        logger.error('Unexpected validation error', { error });
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred during validation',
        });
      }
    }
  };
};

// Common validation schemas
export const schemas = {
  // Pagination
  pagination: z.object({
    query: z.object({
      page: z.string().optional().default('1').transform(Number).pipe(z.number().min(1)),
      limit: z.string().optional().default('10').transform(Number).pipe(z.number().min(1).max(100)),
    }),
  }),

  // Battery ID param
  batteryId: z.object({
    params: z.object({
      batteryId: z.string().uuid('Invalid battery ID format'),
    }),
  }),

  // Facility ID param
  facilityId: z.object({
    params: z.object({
      facilityId: z.string().uuid('Invalid facility ID format'),
    }),
  }),

  // Date range query
  dateRange: z.object({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }),
  }),

  // Sensor reading creation
  sensorReading: z.object({
    body: z.object({
      battery_id: z.string().uuid('Invalid battery ID format'),
      voltage: z.number().min(0).max(100, 'Voltage must be between 0 and 100V'),
      current: z.number().min(-100).max(100, 'Current must be between -100 and 100A'),
      temperature: z.number().min(-50).max(150, 'Temperature must be between -50 and 150°C'),
      state_of_charge: z.number().min(0).max(100, 'SoC must be between 0 and 100%'),
      state_of_health: z.number().min(0).max(100, 'SoH must be between 0 and 100%'),
      cycle_count: z.number().int().min(0, 'Cycle count must be non-negative'),
    }),
  }),

  // Alert creation
  alert: z.object({
    body: z.object({
      battery_id: z.string().uuid('Invalid battery ID format'),
      alert_type: z.enum(['temperature', 'voltage', 'current', 'soc', 'soh', 'prediction', 'anomaly']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      message: z.string().min(1).max(1000, 'Message must be between 1 and 1000 characters'),
      threshold_value: z.number().optional(),
      actual_value: z.number().optional(),
    }),
  }),

  // Facility creation/update
  facility: z.object({
    body: z.object({
      name: z.string().min(1).max(200, 'Name must be between 1 and 200 characters'),
      location: z.string().min(1).max(200, 'Location must be between 1 and 200 characters'),
      latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
      longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
      capacity_kwh: z.number().min(0).optional(),
    }),
  }),

  // Prediction trigger
  predictionTrigger: z.object({
    body: z.object({
      battery_ids: z.array(z.string().uuid()).optional(),
      force: z.boolean().optional().default(false),
    }),
  }),

  // Chatbot query
  chatbotQuery: z.object({
    body: z.object({
      query: z.string().min(1).max(2000, 'Query must be between 1 and 2000 characters'),
      conversation_id: z.string().uuid().optional(),
      include_context: z.boolean().optional().default(true),
    }),
  }),

  // Report generation
  reportGeneration: z.object({
    body: z.object({
      report_type: z.enum(['alert', 'facility', 'battery', 'system', 'compliance']),
      entity_id: z.string().uuid().optional(),
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
      format: z.enum(['pdf', 'json', 'csv']).optional().default('json'),
    }),
  }),
};
