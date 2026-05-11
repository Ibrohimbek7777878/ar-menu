import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: any;

  constructor(message: string, statusCode: number, isOperational: boolean = true, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || 'Ichki xatolik yuz berdi';

  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  const errorResponse: Record<string, any> = {
    error: true,
    message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};