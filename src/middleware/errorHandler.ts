import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './validation';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  if (err instanceof Error && err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      message: err.message || 'Resource not found',
    });
  }

  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
