import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../database/connection.js';
import { blacklistToken } from '../database/redis.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authRateLimiter } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = 900; // 15 minutes in seconds

// @route   POST /api/v1/auth/login
// @desc    Admin login (only admins can login)
// @access  Public
router.post(
  '/login',
  authRateLimiter,
  [
    body('email').isEmail().withMessage('To\'g\'ri email manzilini kiriting'),
    body('password').notEmpty().withMessage('Parol majburiy')
  ],
  asyncHandler(async (req: Request, res: Response) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validatsiya xatosi', 400, true, errors.array());
    }

    const { email, password } = req.body;

    // Find admin by email
    const result = await query(
      'SELECT id, email, password_hash, full_name, role, is_active, two_fa_enabled FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Email yoki parol noto\'g\'ri', 401);
    }

    const admin = result.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      throw new AppError('Hisobingiz faol emas. Administrator bilan bog\'laning', 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Email yoki parol noto\'g\'ri', 401);
    }

    const accessToken = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = uuidv4();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    // Save refresh token to database
    await query(
      'INSERT INTO refresh_tokens (admin_id, token, expires_at) VALUES ($1, $2, $3)',
      [admin.id, refreshToken, refreshTokenExpiry]
    );

    // Update last login
    await query('UPDATE admins SET last_login_at = NOW() WHERE id = $1', [admin.id]);

    logger.info(`Admin logged in: ${admin.email}`);

    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirdingiz',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role
        },
        tokens: {
          access: accessToken,
          refresh: refreshToken,
          expiresIn: JWT_EXPIRES_IN
        }
      }
    });
  })
);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError('Refresh token majburiy', 400);
    }

    // Check if refresh token exists in database
    const result = await query(
      'SELECT rt.admin_id, rt.expires_at, a.email, a.role, a.is_active ' +
      'FROM refresh_tokens rt ' +
      'JOIN admins a ON a.id = rt.admin_id ' +
      'WHERE rt.token = $1',
      [refresh_token]
    );

    if (result.rows.length === 0) {
      throw new AppError('Noto\'g\'ri refresh token', 401);
    }

    const { admin_id, expires_at, email, role, is_active } = result.rows[0];

    // Check if token is expired
    if (new Date(expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);
      throw new AppError('Refresh token muddati tugagan', 401);
    }

    // Check if admin is still active
    if (!is_active) {
      throw new AppError('Hisobingiz faol emas', 403);
    }

    const accessToken = jwt.sign(
      { id: admin_id, email, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        access: accessToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  })
);

// @route   POST /api/v1/auth/logout
// @desc    Admin logout (blacklist token)
// @access  Private (Admin only)
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      // Decode token to get expiry
      const decoded = jwt.decode(token) as { exp?: number };
      const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

      // Blacklist the token
      await blacklistToken(token, Math.max(ttl, 0));

      // Delete refresh token from database
      const { refresh_token } = req.body;
      if (refresh_token) {
        await query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);
      }
    }

    logger.info(`Admin logged out: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Muvaffaqiyatli chiqdingiz'
    });
  })
);

// @route   GET /api/v1/auth/me
// @desc    Get current admin info
// @access  Private (Admin only)
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      'SELECT id, email, full_name, role, two_fa_enabled, last_login_at, created_at ' +
      'FROM admins WHERE id = $1',
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  })
);

// @route   POST /api/v1/auth/change-password
// @desc    Change admin password
// @access  Private (Admin only)
router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').notEmpty().withMessage('Joriy parol majburiy'),
    body('new_password').isLength({ min: 6 }).withMessage('Yangi parol kamida 6 belgi bo\'lishi kerak')
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validatsiya xatosi', 400, true, errors.array());
    }

    const { current_password, new_password } = req.body;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM admins WHERE id = $1',
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isPasswordValid) {
      throw new AppError('Joriy parol noto\'g\'ri', 400);
    }

    // Hash new password
    const saltRounds = 12;
    const new_password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query(
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [new_password_hash, req.user?.id]
    );

    logger.info(`Password changed for admin: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Parol muvaffaqiyatli o\'zgartirildi'
    });
  })
);

export default router;