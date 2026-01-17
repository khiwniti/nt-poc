import { setupServer } from 'msw/node';
import { externalHandlers } from './handlers.js';

export const server = setupServer(...externalHandlers);
