import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStats = await query(
    `SELECT COUNT(*) as total_orders, COALESCE(SUM(final_amount), 0) as total_revenue,
            COUNT(DISTINCT customer_phone_1) as unique_customers, AVG(final_amount) as avg_order_value
     FROM orders WHERE created_at >= $1 AND status != 'cancelled'`,
    [today]
  );

  const weeklyStats = await query(
    `SELECT COUNT(*) as total, COALESCE(SUM(final_amount), 0) as revenue
     FROM orders WHERE created_at >= NOW() - INTERVAL '7 days' AND status != 'cancelled'`
  );

  const topProducts = await query(
    `SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as total_revenue
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.created_at >= $1 GROUP BY p.name ORDER BY total_sold DESC LIMIT 10`,
    [today]
  );

  const pendingOrders = await query(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`);
  const activeShops = await query(`SELECT COUNT(*) as count FROM shops WHERE is_active = true`);

  const recentOrders = await query(
    `SELECT o.order_number, o.customer_name, o.customer_phone_1, o.final_amount, o.status, o.created_at, s.name as shop_name
     FROM orders o JOIN shops s ON s.id = o.shop_id ORDER BY o.created_at DESC LIMIT 10`
  );

  res.json({
    success: true,
    data: {
      today: todayStats.rows[0],
      weekly: weeklyStats.rows[0],
      topProducts: topProducts.rows,
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      activeShops: parseInt(activeShops.rows[0].count),
      recentOrders: recentOrders.rows
    }
  });
}));

router.get('/orders', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const { status, shop_id } = req.query;
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let idx = 1;

  if (status) { params.push(status); whereClause += ` AND o.status = $${idx++}`; }
  if (shop_id) { params.push(shop_id); whereClause += ` AND o.shop_id = $${idx++}`; }

  const countResult = await query(`SELECT COUNT(*) as total FROM orders o ${whereClause}`, params);
  params.push(limit, (page - 1) * limit);

  const result = await query(
    `SELECT o.*, s.name as shop_name FROM orders o JOIN shops s ON s.id = o.shop_id
     ${whereClause} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, params
  );

  res.json({ success: true, data: { orders: result.rows, pagination: { page, limit, total: parseInt(countResult.rows[0].total) } } });
}));

router.get('/users', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await query(
    `SELECT customer_phone_1 as phone, customer_name as name, COUNT(*) as order_count,
            SUM(final_amount) as total_spent, MAX(created_at) as last_order
     FROM orders GROUP BY customer_phone_1, customer_name
     ORDER BY total_spent DESC LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );

  const countResult = await query(`SELECT COUNT(DISTINCT customer_phone_1) as total FROM orders`);
  res.json({ success: true, data: { users: result.rows, pagination: { page, limit, total: parseInt(countResult.rows[0].total) } } });
}));

router.get('/sales', authenticate, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { period = 'daily' } = req.query;
  let groupBy;

  if (period === 'daily') groupBy = 'DATE(created_at)';
  else if (period === 'weekly') groupBy = "DATE_TRUNC('week', created_at)";
  else if (period === 'monthly') groupBy = "DATE_TRUNC('month', created_at)";
  else throw new AppError('Noto\'g\'ri davr', 400);

  const result = await query(
    `SELECT ${groupBy} as date, COUNT(*) as order_count, COALESCE(SUM(final_amount), 0) as revenue,
            AVG(final_amount) as avg_order_value
     FROM orders WHERE status != 'cancelled' GROUP BY ${groupBy} ORDER BY date DESC LIMIT 30`
  );
  res.json({ success: true, data: result.rows });
}));

router.get('/heatmap', authenticate, requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT delivery_lat as lat, delivery_lng as lng, COUNT(*) as order_count, SUM(final_amount) as total_amount
     FROM orders WHERE delivery_lat IS NOT NULL AND delivery_lng IS NOT NULL
     GROUP BY delivery_lat, delivery_lng LIMIT 100`
  );
  res.json({ success: true, data: result.rows });
}));

router.get('/admins', authenticate, requireSuperAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT id, email, full_name, role, is_active, two_fa_enabled, last_login_at, created_at
     FROM admins ORDER BY created_at DESC`
  );
  res.json({ success: true, data: result.rows });
}));

export default router;