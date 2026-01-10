import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server for Node.js environment (tests)
export const server = setupServer(...handlers);
