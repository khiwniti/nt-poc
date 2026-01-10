import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup worker for browser environment (development)
export const worker = setupWorker(...handlers);
