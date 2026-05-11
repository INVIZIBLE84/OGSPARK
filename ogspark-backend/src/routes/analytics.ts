import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User analytics
router.get('/user-activity', AnalyticsController.getUserActivity);

// Admin-only analytics
router.get('/platform-overview', requireRole(['ADMIN']), AnalyticsController.getPlatformOverview);
router.get('/project-growth', requireRole(['ADMIN']), AnalyticsController.getProjectGrowth);
router.get('/system-health', requireRole(['ADMIN']), AnalyticsController.getSystemHealth);
router.get('/admin-dashboard', requireRole(['ADMIN']), AnalyticsController.getAdminDashboard);

export default router;