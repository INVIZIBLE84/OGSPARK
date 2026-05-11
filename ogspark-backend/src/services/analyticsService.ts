import { prisma } from '../config/database';
import { AppError } from '../utils/helpers';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';

export class AnalyticsService {
  static async getPlatformOverview() {
    const cacheKey = 'analytics:platform-overview';
    
    // Try to get from cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache miss for platform overview');
    }

    const [
      totalUsers,
      totalProjects,
      activeProjects,
      archivedProjects,
      recentUsers,
      recentProjects,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.project.count({ where: { status: 'ARCHIVED' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const data = {
      totals: {
        users: totalUsers,
        projects: totalProjects,
        activeProjects,
        archivedProjects,
      },
      recent: {
        users: recentUsers,
        projects: recentProjects,
      },
      calculated: {
        projectCompletionRate: totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0,
        averageProjectsPerUser: totalUsers > 0 ? totalProjects / totalUsers : 0,
      },
    };

    // Cache for 5 minutes
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to cache platform overview');
    }

    return data;
  }

  static async getUserActivity(userId: string) {
    const cacheKey = `analytics:user-activity:${userId}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache miss for user activity');
    }

    const [
      userProjects,
      recentActivity,
      projectStats,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.findMany({
        where: { userId },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.project.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          _all: true,
        },
      }),
    ]);

    const data = {
      projectCount: userProjects.length,
      projectStats: projectStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count._all;
        return acc;
      }, {} as Record<string, number>),
      recentActivity,
      metrics: {
        activeProjects: projectStats.find(stat => stat.status === 'ACTIVE')?._count._all || 0,
        lastActive: userProjects[0]?.updatedAt || new Date(),
      },
    };

    // Cache for 2 minutes
    try {
      await redisClient.setEx(cacheKey, 120, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to cache user activity');
    }

    return data;
  }

  static async getProjectGrowth(timeframe: 'week' | 'month' | 'year' = 'month') {
    const cacheKey = `analytics:project-growth:${timeframe}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache miss for project growth');
    }

    let dateFilter: Date;
    const now = new Date();

    switch (timeframe) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
    }

    const growthData = await prisma.project.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: dateFilter,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const data = {
      timeframe,
      total: growthData.reduce((sum, item) => sum + item._count._all, 0),
      growth: growthData.map(item => ({
        date: item.createdAt.toISOString().split('T')[0],
        count: item._count._all,
      })),
    };

    // Cache for 10 minutes
    try {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to cache project growth');
    }

    return data;
  }

  static async getSystemHealth() {
    const cacheKey = 'analytics:system-health';
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache miss for system health');
    }

    // Database health check
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    const dbStatus = dbHealth ? 'healthy' : 'unhealthy';

    // Redis health check
    let redisStatus = 'unhealthy';
    try {
      await redisClient.ping();
      redisStatus = 'healthy';
    } catch (error) {
      redisStatus = 'unhealthy';
    }

    const data = {
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        api: 'healthy', // Since we're running, API is healthy
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };

    // Cache for 1 minute (system health changes frequently)
    try {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to cache system health');
    }

    return data;
  }
}