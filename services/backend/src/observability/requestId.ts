import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';
import { sentrySetRequestId } from './sentry';

export const requestIdMiddleware = (): RequestHandler => {
  return (req, res, next) => {
    const headerValue = req.header('x-request-id');
    const requestId = headerValue && headerValue.length <= 128 ? headerValue : randomUUID();

    req.requestId = requestId;
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    sentrySetRequestId(requestId);
    next();
  };
};

