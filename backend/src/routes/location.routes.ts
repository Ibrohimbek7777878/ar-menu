import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/nearby-shops', asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) throw new AppError('Latitude va longitude kerak', 400);

  const radiusInMeters = parseFloat(radius as string) * 1000;
  const result = await query(
    `SELECT id, name, address, city, latitude, longitude, phone, image_url, rating,
            earth_distance(ll_to_earth($1, $2), ll_to_earth(latitude, longitude)) as distance_m
     FROM shops WHERE is_active = true AND is_open = true
       AND earth_box(ll_to_earth($1, $2), $3) @> ll_to_earth(latitude, longitude)
     ORDER BY distance_m LIMIT 20`,
    [parseFloat(lat as string), parseFloat(lng as string), radiusInMeters]
  );
  res.json({ success: true, data: result.rows });
}));

router.get('/distance', asyncHandler(async (req: Request, res: Response) => {
  const { lat1, lng1, lat2, lng2 } = req.query;
  if (!lat1 || !lng1 || !lat2 || !lng2) throw new AppError('Barcha koordinatalar kerak', 400);

  const result = await query(
    `SELECT earth_distance(ll_to_earth($1, $2), ll_to_earth($3, $4)) as distance_m`,
    [parseFloat(lat1 as string), parseFloat(lng1 as string), parseFloat(lat2 as string), parseFloat(lng2 as string)]
  );
  res.json({ success: true, data: result.rows[0] });
}));

export default router;