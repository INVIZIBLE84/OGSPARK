import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { requireRole } from '../middleware/auth';

export class AnalyticsController {
  static async getPlatformOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getPlatformOverview();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const data = await AnalyticsService.getUserActivity(userId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProjectGrowth(req: Request, res: Response, next: NextFunction) {
    try {
      const timeframe = (req.query.timeframe as 'week' | 'month' | 'year') || 'month';
      const data = await AnalyticsService.getProjectGrowth(timeframe);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getSystemHealth();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const [platformOverview, projectGrowth, userStats, systemHealth] = await Promise.all([
        AnalyticsService.getPlatformOverview(),
        AnalyticsService.getProjectGrowth('month'),
        require('../services/userService').UserService.getUserStats(),
        AnalyticsService.getSystemHealth(),
      ]);

      res.json({
        success: true,
        data: {
          platformOverview,
          projectGrowth,
          userStats,
          systemHealth,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}