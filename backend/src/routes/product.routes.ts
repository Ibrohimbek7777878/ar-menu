import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/v1/products - Get all products
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const { shop_id, category_id, search, available } = req.query;

  let whereClause = 'WHERE p.is_available = true';
  const params: any[] = [];
  let idx = 1;

  if (shop_id) { params.push(shop_id); whereClause += ` AND p.shop_id = $${idx++}`; }
  if (category_id) { params.push(category_id); whereClause += ` AND p.category_id = $${idx++}`; }
  if (available === 'true') { whereClause += ' AND p.stock_quantity > 0'; }
  if (search) { params.push(`%${search}%`); whereClause += ` AND p.name ILIKE $${idx++}`; }

  const countResult = await query(`SELECT COUNT(*) as total FROM products p ${whereClause}`, params);
  params.push(limit, offset);

  const result = await query(
    `SELECT p.*, s.name as shop_name, s.city, c.name as category_name
     FROM products p LEFT JOIN shops s ON s.id = p.shop_id LEFT JOIN categories c ON c.id = p.category_id
     ${whereClause} ORDER BY p.name LIMIT $${idx++} OFFSET $${idx++}`, params
  );

  res.json({ success: true, data: { products: result.rows, pagination: { page, limit, total: parseInt(countResult.rows[0].total) }}});
}));

// GET /api/v1/products/search - Search products
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) throw new AppError('Qidiruv so\'zi kerak', 400);

  const result = await query(
    `SELECT p.*, s.name as shop_name, s.address, s.latitude, s.longitude
     FROM products p JOIN shops s ON s.id = p.shop_id
     WHERE p.is_available = true AND s.is_active = true AND p.name ILIKE $1
     LIMIT 30`, [`%${q}%`]
  );

  res.json({ success: true, data: result.rows });
}));

// GET /api/v1/products/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.*, s.name as shop_name, s.city, c.name as category_name
     FROM products p LEFT JOIN shops s ON s.id = p.shop_id LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`, [req.params.id]
  );
  if (result.rows.length === 0) throw new AppError('Mahsulot topilmadi', 404);
  res.json({ success: true, data: result.rows[0] });
}));

// POST /api/v1/products - Create product (Admin only)
router.post('/', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, price, unit, images, shop_id, category_id, stock_quantity } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const result = await query(
    `INSERT INTO products (name, slug, description, price, unit, images, shop_id, category_id, stock_quantity, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
    [name, slug, description, price, unit || 'dona', images || [], shop_id, category_id, stock_quantity || 0]
  );

  logger.info(`Product created: ${name}`);
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/v1/products/:id - Update product (Admin only)
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const fields = ['name', 'description', 'price', 'unit', 'images', 'category_id', 'is_available', 'stock_quantity'];
  const updateFields = []; const params: any[] = []; let idx = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) { updateFields.push(`${f} = $${idx++}`); params.push(req.body[f]); }
  }
  if (updateFields.length === 0) throw new AppError('Maydonlar topilmadi', 400);
  params.push(req.params.id);

  const result = await query(
    `UPDATE products SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${idx++} RETURNING *`, params
  );
  if (result.rows.length === 0) throw new AppError('Mahsulot topilmadi', 404);
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/v1/products/bulk-update - Bulk price update (Admin only)
router.post('/bulk-update', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { product_ids, price_change, price_change_type } = req.body;
  if (!product_ids?.length) throw new AppError('Mahsulotlar tanlanmadi', 400);

  const operator = price_change_type === 'percentage' ? `* (1 + ${price_change}/100)` : `+ ${price_change}`;
  const result = await query(
    `UPDATE products SET price = price ${operator} WHERE id = ANY($1) RETURNING id, name, price`,
    [product_ids]
  );

  logger.info(`Bulk update: ${result.rows.length} products updated by admin ${req.user?.email}`);
  res.json({ success: true, message: `${result.rows.length} ta mahsulot yangilandi`, data: result.rows });
}));

// DELETE /api/v1/products/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await query('UPDATE products SET is_available = false WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Mahsulot o\'chirildi' });
}));

export default router;