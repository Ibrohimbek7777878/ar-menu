import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

// Global rate limiter - 60 requests per minute
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Juda ko\'p so\'rovlar. Iltimos, 1 daqiqadan keyin qayta urinib ko\'ring.',
    retryAfter: 60
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded: ${req.ip} ${req.method} ${req.path}`);
    res.status(429).json({
      error: true,
      message: 'Juda ko\'p so\'rovlar. Iltimos, 1 daqiqadan keyin qayta urinib ko\'ring.',
      retryAfter: 60
    });
  }
});

// Order creation rate limiter - 3 orders per 5 minutes per phone
export const orderRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 orders per 5 minutes
  keyGenerator: (req: Request) => {
    return req.body.customer_phone_1 || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Juda ko\'p buyurtma. Iltimos, 5 daqiqadan keyin qayta urinib ko\'ring.',
    retryAfter: 300
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Order rate limit exceeded: ${req.body.customer_phone_1 || req.ip}`);
    res.status(429).json({
      error: true,
      message: 'Juda ko\'p buyurtma. Iltimos, 5 daqiqadan keyin qayta urinib ko\'ring.',
      retryAfter: 300
    });
  }
});

// Auth rate limiter - 5 failed attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts
  keyGenerator: (req: Request) => {
    return req.body.email || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: true,
    message: 'Juda ko\'p urinishlar. Hisobingiz 15 daqiqaga bloklanadi.',
    retryAfter: 900
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded: ${req.body.email || req.ip}`);
    res.status(429).json({
      error: true,
      message: 'Juda ko\'p urinishlar. Hisobingiz 15 daqiqaga bloklanadi.',
      retryAfter: 900
    });
  }
});