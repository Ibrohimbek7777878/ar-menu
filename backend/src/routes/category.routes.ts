import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../database/redis.js';

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = 'all_categories';
  let categories = await cacheGet(cacheKey);
  
  if (!categories) {
    const result = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM shops WHERE category_id = c.id AND is_active = true) as shop_count
       FROM categories c ORDER BY c.sort_order, c.name`
    );
    categories = result.rows;
    await cacheSet(cacheKey, categories, 3600);
  }
  res.json({ success: true, data: categories });
}));

router.post('/', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, color, icon_url, parent_id, sort_order } = req.body;
  const slug = name.toLowerCase().replace(/ш/g, 'sh').replace(/[^a-z0-9]+/g, '-');

  const result = await query(
    `INSERT INTO categories (name, slug, color, icon_url, parent_id, sort_order) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, slug, color || '#1B5E20', icon_url, parent_id, sort_order || 0]
  );

  await cacheSet('all_categories', null, -1);
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, color, icon_url, sort_order } = req.body;
  const result = await query(
    `UPDATE categories SET name = COALESCE($1, name), color = COALESCE($2, color), 
     icon_url = COALESCE($3, icon_url), sort_order = COALESCE($4, sort_order), updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, color, icon_url, sort_order, req.params.id]
  );
  if (result.rows.length === 0) throw new AppError('Kategoriya topilmadi', 404);
  await cacheSet('all_categories', null, -1);
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  await cacheSet('all_categories', null, -1);
  res.json({ success: true, message: 'Kategoriya o\'chirildi' });
}));

export default router;