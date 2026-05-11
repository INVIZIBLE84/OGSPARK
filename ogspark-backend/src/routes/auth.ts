import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest, authSchemas, userSchemas } from '../middleware/validation';
import { authenticate, authRateLimiter, requireRole } from '../middleware/auth';

const router = Router();

// ==================== Public Routes ====================

// Student Registration (with auto-generated student ID)
router.post(
  '/register/student',
  authRateLimiter,
  validateRequest(authSchemas.registerStudent),
  AuthController.registerStudent
);

// Regular User Registration
router.post(
  '/register',
  authRateLimiter,
  validateRequest(authSchemas.register),
  AuthController.register
);

// Login (works for both students and regular users)
router.post(
  '/login',
  authRateLimiter,
  validateRequest(authSchemas.login),
  AuthController.login
);

// Forgot Password
router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest(authSchemas.forgotPassword),
  AuthController.forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest(authSchemas.resetPassword),
  AuthController.resetPassword
);

// Refresh Token
router.post(
  '/refresh-token',
  authRateLimiter,
  validateRequest(authSchemas.refreshToken),
  AuthController.refreshToken
);

// Verify Email
router.get(
  '/verify-email/:token',
  AuthController.verifyEmail
);

// ==================== Protected Routes ====================

// Logout (requires authentication)
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

// Get Current User Profile
router.get(
  '/me',
  authenticate,
  AuthController.getMe
);

// Update Current User Profile
router.put(
  '/me',
  authenticate,
  validateRequest(userSchemas.updateProfile),
  AuthController.updateProfile
);

// Change Password
router.post(
  '/change-password',
  authenticate,
  validateRequest(userSchemas.changePassword),
  AuthController.changePassword
);

// ==================== Student Specific Routes ====================

// Get Student by ID (requires authentication)
router.get(
  '/student/:studentId',
  authenticate,
  AuthController.getUserByStudentId
);

// Update Student Profile (students can update their own profile)
router.put(
  '/student/profile',
  authenticate,
  validateRequest(userSchemas.updateProfile),
  AuthController.updateStudentProfile
);

// Get Students by Department
router.get(
  '/students/department/:department',
  authenticate,
  AuthController.getStudentsByDepartment
);

// Check if Student ID exists
router.get(
  '/student-id/:studentId/exists',
  AuthController.checkStudentId
);

// ==================== Admin Only Routes ====================

// Get All Students (with pagination)
router.get(
  '/students',
  authenticate,
  requireRole(['ADMIN']),
  AuthController.getAllStudents
);

// Get Student Statistics (admin only)
router.get(
  '/students/stats',
  authenticate,
  requireRole(['ADMIN']),
  AuthController.getStudentStats
);

// Get User by ID (admin only)
router.get(
  '/user/:id',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(userSchemas.userId),
  AuthController.getUserById
);

// Update User Role (admin only)
router.put(
  '/user/:id/role',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(userSchemas.updateRole),
  AuthController.updateUserRole
);

// Deactivate User (admin only)
router.delete(
  '/user/:id',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(userSchemas.userId),
  AuthController.deactivateUser
);

// Activate User (admin only)
router.post(
  '/user/:id/activate',
  authenticate,
  requireRole(['ADMIN']),
  validateRequest(userSchemas.userId),
  AuthController.activateUser
);

// Get All Users (admin only)
router.get(
  '/users',
  authenticate,
  requireRole(['ADMIN']),
  AuthController.getAllUsers
);

// ==================== Session Management ====================

// Get All Active Sessions (current user)
router.get(
  '/sessions',
  authenticate,
  AuthController.getActiveSessions
);

// Revoke Session (logout from specific device)
router.delete(
  '/sessions/:sessionId',
  authenticate,
  AuthController.revokeSession
);

// Revoke All Sessions (logout from all devices)
router.post(
  '/sessions/revoke-all',
  authenticate,
  AuthController.revokeAllSessions
);

export default router;