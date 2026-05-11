import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User profile routes (accessible to all authenticated users)
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.post('/change-password', UserController.changePassword);

// Admin-only routes
router.get('/', requireRole(['ADMIN']), UserController.getUsers);
router.get('/stats', requireRole(['ADMIN']), UserController.getUserStats);
router.get('/:id', requireRole(['ADMIN']), UserController.getUser);
router.put('/:id/role', requireRole(['ADMIN']), UserController.updateUserRole);
router.delete('/:id', requireRole(['ADMIN']), UserController.deactivateUser);

export default router;