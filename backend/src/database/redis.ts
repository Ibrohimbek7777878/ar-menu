import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    await redis.ping();
    logger.info('✅ Redis connected successfully');
    logger.info(`📊 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
};

// Cache functions
export const cacheSet = async (key: string, value: any, ttlSeconds?: number): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    logger.error('Redis set error:', error);
    throw error;
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
    throw error;
  }
};

export const cacheExists = async (key: string): Promise<boolean> => {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis exists error:', error);
    return false;
  }
};

// Session management
export const setSession = async (sessionId: string, data: any, ttlSeconds: number = 86400): Promise<void> => {
  await cacheSet(`session:${sessionId}`, data, ttlSeconds);
};

export const getSession = async <T>(sessionId: string): Promise<T | null> => {
  return await cacheGet<T>(`session:${sessionId}`);
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await cacheDel(`session:${sessionId}`);
};

// Token blacklist for JWT
export const blacklistToken = async (token: string, ttlSeconds: number): Promise<void> => {
  await cacheSet(`blacklist:${token}`, '1', ttlSeconds);
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  return await cacheExists(`blacklist:${token}`);
};

// Rate limiting for orders
export const incrementOrderCount = async (phone: string, windowMs: number): Promise<number> => {
  const key = `rate:order:${phone}`;
  const current = await redis.get(key);
  const count = current ? parseInt(current) + 1 : 1;
  await redis.setex(key, Math.floor(windowMs / 1000), count.toString());
  return count;
};

export const getOrderCount = async (phone: string): Promise<number> => {
  const key = `rate:order:${phone}`;
  const count = await redis.get(key);
  return count ? parseInt(count) : 0;
};

export default redis;