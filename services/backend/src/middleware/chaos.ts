import type { Request, Response, NextFunction } from 'express';
import { chaosMonkey } from '../chaos/chaosMonkey.js';

export const chaosMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Inject service failure
    await chaosMonkey.injectServiceFailure();

    // Inject network latency
    await chaosMonkey.injectNetworkLatency();

    next();
  } catch (error) {
    next(error);
  }
};
