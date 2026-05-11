import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection.js';
import { isTokenBlacklisted } from '../database/redis.js';
import { AppError, asyncHandler } from './errorHandler.js';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Avtorizatsiya tokeni topilmadi', 401);
  }

  const token = authHeader.split(' ')[1];
  if (await isTokenBlacklisted(token)) {
    throw new AppError('Token bekor qilingan', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; };
    const result = await query('SELECT id, email, role, is_active FROM admins WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new AppError('Foydalanuvchi topilmadi yoki faol emas', 401);
    }
    req.user = { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) throw new AppError('Noto\'g\'ri token', 401);
    if (error instanceof jwt.TokenExpiredError) throw new AppError('Token muddati tugagan', 401);
    throw error;
  }
});

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Avtorizatsiya qilinmagan', 401));
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    throw new AppError('Ruxsat yo\'q. Faqat adminlar kirishi mumkin', 403);
  }
  next();
};

export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('Avtorizatsiya qilinmagan', 401));
  if (req.user.role !== 'super_admin') {
    throw new AppError('Ruxsat yo\'q. Faqat super admin kirishi mumkin', 403);
  }
  next();
};

export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; };
      const result = await query('SELECT id, email, role, is_active FROM admins WHERE id = $1', [decoded.id]);
      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role };
      }
    } catch (error) {
      // Token invalid but continue
    }
  }
  next();
});