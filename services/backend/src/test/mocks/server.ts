import { setupServer } from 'msw/node';
import { externalHandlers } from './handlers';

export const server = setupServer(...externalHandlers);
