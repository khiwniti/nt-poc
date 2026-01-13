import { beforeAll, vi } from 'vitest';
import dotenv from 'dotenv';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_DISABLED = 'true';

beforeAll(() => {
  dotenv.config({ path: '.env.test' });
  
  // Disable email sending in tests if not already configured
  if (!process.env.SENDGRID_API_KEY) {
    process.env.SENDGRID_API_KEY = '';
  }
});
