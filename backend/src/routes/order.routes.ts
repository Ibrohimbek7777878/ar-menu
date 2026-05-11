import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { orderRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const generateOrderNumber = async (): Promise<string> => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const result = await query(
    `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE($1)`, [now]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `OSG-${dateStr}-${count.toString().padStart(4, '0')}`;
};

const calculateDeliveryFee = (shopLat: number, shopLng: number, deliveryLat: number, deliveryLng: number): number => {
  const R = 6371;
  const dLat = (deliveryLat - shopLat) * Math.PI / 180;
  const dLng = (deliveryLng - shopLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(shopLat * Math.PI / 180) * Math.cos(deliveryLat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  if (distance <= 2) return 0;
  if (distance <= 5) return 5000;
  if (distance <= 10) return 10000;
  return 15000;
};

router.post('/', orderRateLimiter, [
  body('customer_name').trim().isLength({ min: 2, max: 255 }),
  body('customer_phone_1').trim().matches(/^\+998[0-9]{9}$/),
  body('customer_phone_2').optional().trim().matches(/^\+998[0-9]{9}$/),
  body('customer_phone_3').optional().trim().matches(/^\+998[0-9]{9}$/),
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validatsiya xatosi', 400, true, errors.array());

  const {
    customer_name, customer_phone_1, customer_phone_2, customer_phone_3,
    items, delivery_address, delivery_lat, delivery_lng,
    is_pickup = false, customer_notes, payment_method = 'cash_on_delivery'
  } = req.body;

  try {
    await query('BEGIN');

    const firstItem = items[0];
    const shopResult = await query('SELECT shop_id FROM products WHERE id = $1', [firstItem.product_id]);
    if (shopResult.rows.length === 0) throw new AppError('Mahsulot topilmadi', 404);
    const shopId = shopResult.rows[0].shop_id;

    const shopDetails = await query('SELECT id, name, latitude, longitude, is_open FROM shops WHERE id = $1 AND is_active = true', [shopId]);
    if (shopDetails.rows.length === 0) throw new AppError('Do\'kon topilmadi', 404);
    if (!shopDetails.rows[0].is_open) throw new AppError('Do\'kon hozirda yopiq', 400);

    let totalAmount = 0;
    for (const item of items) {
      const productResult = await query('SELECT id, price, is_available, stock_quantity FROM products WHERE id = $1', [item.product_id]);
      if (productResult.rows.length === 0) throw new AppError(`Mahsulot topilmadi`, 404);
      if (!productResult.rows[0].is_available) throw new AppError(`Mahsulot mavjud emas`, 400);
      if (productResult.rows[0].stock_quantity < item.quantity) throw new AppError(`Mahsulot soni yetarli emas`, 400);
      totalAmount += parseFloat(productResult.rows[0].price) * item.quantity;
    }

    let deliveryFee = 0;
    if (!is_pickup && delivery_lat && delivery_lng) {
      deliveryFee = calculateDeliveryFee(
        parseFloat(shopDetails.rows[0].latitude), parseFloat(shopDetails.rows[0].longitude),
        parseFloat(delivery_lat), parseFloat(delivery_lng)
      );
    }

    const minOrderAmount = 20000;
    if (totalAmount < minOrderAmount) throw new AppError(`Minimal buyurtma summasi: ${minOrderAmount} so'm`, 400);
    const finalAmount = totalAmount + deliveryFee;
    const orderNumber = await generateOrderNumber();

    const orderResult = await query(
      `INSERT INTO orders (order_number, shop_id, customer_name, customer_phone_1, customer_phone_2, customer_phone_3,
        delivery_address, delivery_lat, delivery_lng, is_pickup, total_amount, delivery_fee, discount_amount, final_amount,
        payment_method, customer_notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13,$14,$15,'pending') RETURNING id`,
      [orderNumber, shopId, customer_name, customer_phone_1, customer_phone_2 || null, customer_phone_3 || null,
       delivery_address || null, delivery_lat || null, delivery_lng || null, is_pickup,
       totalAmount, deliveryFee, finalAmount, payment_method, customer_notes || null]
    );

    const orderId = orderResult.rows[0].id;
    for (const item of items) {
      const p = await query('SELECT price, name FROM products WHERE id = $1', [item.product_id]);
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, item.product_id, p.rows[0].name, item.quantity, parseFloat(p.rows[0].price), parseFloat(p.rows[0].price) * item.quantity]
      );
      await query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    const fullOrder = await query(
      `SELECT o.*, s.name as shop_name FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = $1`, [orderId]
    );
    const orderItems = await query(`SELECT product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = $1`, [orderId]);

    await query('COMMIT');
    logger.info(`New order: ${orderNumber}`);

    const estimatedDeliveryTime = new Date(Date.now() + 45 * 60000);
    res.status(201).json({ success: true, message: 'Buyurtmangiz qabul qilindi!', data: { order: { ...fullOrder.rows[0], items: orderItems.rows, estimated_delivery_time: estimatedDeliveryTime } } });
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}));

router.get('/track/:phone', asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.params;
  if (!phone?.startsWith('+998')) throw new AppError('Telefon +998XXXXXXXXX formatida', 400);

  const result = await query(
    `SELECT o.*, s.name as shop_name FROM orders o JOIN shops s ON s.id = o.shop_id
     WHERE o.customer_phone_1 = $1 OR o.customer_phone_2 = $1 OR o.customer_phone_3 = $1
     ORDER BY o.created_at DESC LIMIT 10`, [phone]
  );

  const orders = await Promise.all(result.rows.map(async (order: any) => {
    const items = await query(`SELECT product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = $1`, [order.id]);
    return { ...order, items: items.rows };
  }));
  res.json({ success: true, data: orders });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT o.*, s.name as shop_name FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = $1`, [req.params.id]
  );
  if (result.rows.length === 0) throw new AppError('Buyurtma topilmadi', 404);
  const items = await query(`SELECT product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = $1`, [req.params.id]);
  res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
}));

router.put('/:id/status', authenticate, requireAdmin, [
  body('status').isIn(['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
], asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, courier_name, courier_phone, admin_notes } = req.body;

  const current = await query('SELECT status FROM orders WHERE id = $1', [id]);
  if (current.rows.length === 0) throw new AppError('Buyurtma topilmadi', 404);
  const oldStatus = current.rows[0].status;

  await query(`UPDATE orders SET status=$1, courier_name=COALESCE($2,courier_name), courier_phone=COALESCE($3,courier_phone),
    admin_notes=COALESCE($4,admin_notes), updated_at=NOW() WHERE id=$5`,
    [status, courier_name, courier_phone, admin_notes, id]);

  if (status === 'delivered') await query('UPDATE orders SET actual_delivery_time=NOW() WHERE id=$1', [id]);
  await query(`INSERT INTO order_status_history (order_id, old_status, new_status, changed_by) VALUES ($1,$2,$3,$4)`,
    [id, oldStatus, status, req.user?.id]);

  logger.info(`Order ${id}: ${oldStatus} -> ${status}`);
  res.json({ success: true, message: 'Holat o\'zgartirildi' });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const order = await query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
  if (order.rows.length === 0) throw new AppError('Buyurtma topilmadi', 404);
  if (order.rows[0].status !== 'pending') throw new AppError('Faqat kutilayotgan buyurtma bekor qilinadi', 400);

  await query('UPDATE orders SET status=\'cancelled\', updated_at=NOW() WHERE id=$1', [req.params.id]);
  await query('UPDATE products SET stock_quantity = stock_quantity + oi.quantity FROM order_items oi WHERE oi.order_id=$1 AND products.id=oi.product_id', [req.params.id]);
  res.json({ success: true, message: 'Buyurtma bekor qilindi' });
}));

export default router;