import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'SERVER_ERROR';

  const msgLower = (message || '').toLowerCase();
  if (
    msgLower.includes('already exists') ||
    msgLower.includes('already taken') ||
    msgLower.includes('duplicate') ||
    err.code === 11000
  ) {
    statusCode = 409;
    code = 'CONFLICT';
  } else if (
    msgLower.includes('invalid credentials') ||
    msgLower.includes('incorrect password') ||
    msgLower.includes('unauthorized') ||
    msgLower.includes('token')
  ) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
  } else if (
    msgLower.includes('access denied') ||
    msgLower.includes('permission denied') ||
    msgLower.includes('not permitted') ||
    msgLower.includes('only the creator') ||
    msgLower.includes('only the owner')
  ) {
    statusCode = 403;
    code = 'FORBIDDEN';
  } else if (
    msgLower.includes('not found') ||
    msgLower.includes('invalid room invitation key') ||
    msgLower.includes('room invitation key expired')
  ) {
    statusCode = 404;
    code = 'NOT_FOUND';
  } else if (msgLower.includes('validation')) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
  }

  logger.error(
    `[${req.method}] ${req.url} - Error: ${message}`,
    'ErrorHandler',
    err,
    { body: req.body, query: req.query, params: req.params }
  );

  sendError(
    res,
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : message,
    statusCode,
    code,
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND');
}

