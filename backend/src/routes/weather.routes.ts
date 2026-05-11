import { Router, Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler.js';
import { cacheGet, cacheSet } from '../database/redis.js';

const router = Router();
const API_KEY = process.env.OPENWEATHER_API_KEY || '';
const YANGI_YER_LAT = 40.5966;
const YANGI_YER_LON = 68.7786;

// GET /api/v1/weather/current - Hozirgi ob-havo
router.get('/current', asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'weather:current';
  let weather = await cacheGet(cacheKey);

  if (!weather) {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat: YANGI_YER_LAT, lon: YANGI_YER_LON, appid: API_KEY, units: 'metric', lang: 'uz' }
    });

    weather = {
      temp: response.data.main.temp,
      feels_like: response.data.main.feels_like,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${response.data.weather[0].icon}@2x.png`,
      wind_speed: response.data.wind.speed,
      city: response.data.name
    };

    await cacheSet(cacheKey, weather, 1800);
  }

  res.json({ success: true, data: weather });
}));

// GET /api/v1/weather/forecast - 3 kunlik prognoz
router.get('/forecast', asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = 'weather:forecast';
  let forecast = await cacheGet(cacheKey);

  if (!forecast) {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: { lat: YANGI_YER_LAT, lon: YANGI_YER_LON, appid: API_KEY, units: 'metric', lang: 'uz', cnt: 24 }
    });

    forecast = response.data.list.map((item: any) => ({
      date: item.dt_txt,
      temp: item.main.temp,
      feels_like: item.main.feels_like,
      humidity: item.main.humidity,
      description: item.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`,
      wind_speed: item.wind.speed
    }));

    await cacheSet(cacheKey, forecast, 1800);
  }

  res.json({ success: true, data: forecast });
}));

export default router;