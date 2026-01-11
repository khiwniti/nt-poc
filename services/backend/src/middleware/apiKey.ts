import type { NextFunction, Request, Response } from 'express';

const getValidApiKeys = (): Set<string> => {
  const keys = [
    process.env.MLOPS_API_KEY,
    process.env.SIMULATOR_API_KEY,
    process.env.FRONTEND_API_KEY,
  ].filter((key): key is string => typeof key === 'string' && key.length > 0);
  return new Set(keys);
};

export const authenticateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('x-api-key');
  const validApiKeys = getValidApiKeys();

  if (!apiKey || !validApiKeys.has(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};
