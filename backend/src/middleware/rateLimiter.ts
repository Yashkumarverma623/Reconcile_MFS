import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { AppError } from './errorHandler';

export const rateLimiter = (options: { windowMs: number; max: number; keyPrefix?: string }) => {
  const { windowMs, max, keyPrefix = 'rate-limit' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test') {
      return next();
    }
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${req.user?.id || ip}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Redis ZSET for sliding window
      const multi = redisClient.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.zcard(key);
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const requestCount = (results?.[2]?.[1] as number) || 0;

      if (requestCount > max) {
        return next(
          new AppError('Too many requests, please try again later.', 429, 'RATE_LIMIT_EXCEEDED')
        );
      }

      next();
    } catch (err) {
      // In case Redis is unavailable, fall through gracefully
      console.warn('[RateLimiter] Redis rate limiting error:', err);
      next();
    }
  };
};
