import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// @route   GET /api/v1/shops
// @desc    Get all shops (with pagination and filters)
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const { city, is_open } = req.query;

  let whereClause = 'WHERE s.is_active = true';
  const params: any[] = [];
  let paramIndex = 1;

  if (city) {
    params.push(city);
    whereClause += ` AND s.city = $${paramIndex++}`;
  }

  if (is_open !== undefined) {
    params.push(is_open === 'true');
    whereClause += ` AND s.is_open = $${paramIndex++}`;
  }

  const countResult = await query(`SELECT COUNT(*) as total FROM shops s ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].total);

  params.push(limit, offset);
  const shopsResult = await query(
    `SELECT s.*, c.name as category_name FROM shops s
     LEFT JOIN categories c ON c.id = s.category_id
     ${whereClause} ORDER BY s.rating DESC, s.name
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  res.json({
    success: true,
    data: {
      shops: shopsResult.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    }
  });
}));

// @route   GET /api/v1/shops/nearby
// @desc    Get nearby shops based on location
// @access  Public
router.get('/nearby', asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radius = 5 } = req.query;
  const radiusInMeters = parseFloat(radius as string) * 1000;

  const result = await query(
    `SELECT s.*, c.name as category_name,
            earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) as distance
     FROM shops s LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.is_active = true AND s.is_open = true
       AND earth_box(ll_to_earth($1, $2), $3) @> ll_to_earth(s.latitude, s.longitude)
     ORDER BY distance LIMIT 20`,
    [parseFloat(lat as string), parseFloat(lng as string), radiusInMeters]
  );

  res.json({ success: true, data: result.rows });
}));

// @route   GET /api/v1/shops/:id
// @desc    Get shop by ID
// @access  Public
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT s.*, c.name as category_name FROM shops s
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE s.id = $1 AND s.is_active = true`,
    [req.params.id]
  );

  if (result.rows.length === 0) throw new AppError('Do\'kon topilmadi', 404);
  res.json({ success: true, data: result.rows[0] });
}));

// @route   POST /api/v1/shops
// @desc    Create a new shop (Admin only)
// @access  Private (Admin only)
router.post('/', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, address, city, latitude, longitude, phone, category_id, opening_time, closing_time, image_url } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const result = await query(
    `INSERT INTO shops (name, slug, address, city, latitude, longitude, phone, category_id, opening_time, closing_time, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [name, slug, address, city, latitude, longitude, phone, category_id, opening_time, closing_time, image_url]
  );

  logger.info(`Shop created: ${name} by admin ${req.user?.email}`);
  res.status(201).json({ success: true, message: 'Do\'kon qo\'shildi', data: result.rows[0] });
}));

// @route   PUT /api/v1/shops/:id
// @desc    Update shop (Admin only)
// @access  Private (Admin only)
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const fields = ['name', 'address', 'city', 'latitude', 'longitude', 'phone', 'category_id', 'opening_time', 'closing_time', 'image_url', 'is_open'];
  const updateFields = [];
  const params: any[] = [];
  let idx = 1;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${idx++}`);
      params.push(req.body[field]);
    }
  }

  if (updateFields.length === 0) throw new AppError('Maydonlar topilmadi', 400);
  params.push(id);

  const result = await query(
    `UPDATE shops SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${idx++} RETURNING *`,
    params
  );

  if (result.rows.length === 0) throw new AppError('Do\'kon topilmadi', 404);
  res.json({ success: true, data: result.rows[0] });
}));

// @route   DELETE /api/v1/shops/:id
// @desc    Delete shop (soft delete - Admin only)
// @access  Private (Admin only)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    'UPDATE shops SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
    [req.params.id]
  );

  if (result.rows.length === 0) throw new AppError('Do\'kon topilmadi', 404);
  res.json({ success: true, message: 'Do\'kon o\'chirildi' });
}));

export default router;