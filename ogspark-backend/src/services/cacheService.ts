import { redisClient } from '../config/redis';
import logger from '../utils/logger';

export class CacheService {
  static async get(key: string): Promise<any> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, expirationSeconds?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (expirationSeconds) {
        await redisClient.setEx(key, expirationSeconds, stringValue);
      } else {
        await redisClient.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  }

  static async clearUserCache(userId: string): Promise<void> {
    try {
      await this.deletePattern(`analytics:user-activity:${userId}`);
      await this.deletePattern(`user:${userId}:*`);
    } catch (error) {
      logger.error('Clear user cache error:', error);
    }
  }

  static async clearAnalyticsCache(): Promise<void> {
    try {
      await this.deletePattern('analytics:*');
    } catch (error) {
      logger.error('Clear analytics cache error:', error);
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}