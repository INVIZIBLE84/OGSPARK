import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AppError } from '../utils/helpers';
import logger from '../utils/logger';

export class AuthController {
  // ==================== AUTHENTICATION METHODS ====================
  
  // Regular user registration
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await AuthService.register(email, password, name);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Student registration with auto-generated student ID
  static async registerStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, department, dateOfBirth, phoneNumber, address } = req.body;
      
      const result = await AuthService.registerStudent(
        email, 
        password, 
        name, 
        department,
        dateOfBirth,
        phoneNumber,
        address
      );
      
      res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: {
          user: result.user,
          token: result.token,
          studentId: result.user.studentId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.substring(7);
      if (token) {
        await AuthService.logout(token);
      }
      
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const user = await AuthService.getCurrentUser(req.userId);
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update profile
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { name, avatar, phoneNumber, address } = req.body;
      const user = await AuthService.updateProfile(req.userId, { name, avatar, phoneNumber, address });
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Change password
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== PASSWORD RESET METHODS ====================
  
  // Forgot password - send reset email
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      
      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset password with token
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      
      res.json({
        success: true,
        message: 'Password reset successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== EMAIL VERIFICATION ====================
  
  // Send verification email
  static async sendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const result = await AuthService.sendVerificationEmail(req.userId);
      
      res.json({
        success: true,
        message: 'Verification email sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify email with token
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const result = await AuthService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== REFRESH TOKEN ====================
  
  // Refresh JWT token
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== STUDENT MANAGEMENT ====================
  
  // Get student by ID
  static async getUserByStudentId(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const user = await AuthService.getUserByStudentId(studentId);
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update student profile
  static async updateStudentProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { name, avatar, phoneNumber, address, dateOfBirth } = req.body;
      const user = await AuthService.updateStudentProfile(req.userId, { 
        name, 
        avatar, 
        phoneNumber, 
        address, 
        dateOfBirth 
      });
      
      res.json({
        success: true,
        message: 'Student profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get students by department
  static async getStudentsByDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { department } = req.params;
      const students = await AuthService.getStudentsByDepartment(department);
      
      res.json({
        success: true,
        data: students,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all students (with pagination)
  static async getAllStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const department = req.query.department as string;
      
      const result = await AuthService.getAllStudents(page, limit, department);
      
      res.json({
        success: true,
        data: result.students,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student statistics
  static async getStudentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AuthService.getStudentStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check if student ID exists
  static async checkStudentId(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const exists = await AuthService.checkStudentIdExists(studentId);
      
      res.json({
        success: true,
        data: { exists, studentId },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ATTENDANCE CONTROLLERS ====================
  
  // Mark attendance
  static async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { date, status, subject, remarks } = req.body;
      const attendance = await AuthService.markAttendance(
        req.userId, 
        date || new Date(), 
        status,
        subject,
        remarks
      );
      
      res.json({
        success: true,
        message: 'Attendance marked successfully',
        data: attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get attendance by student ID
  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;
      
      const attendance = await AuthService.getAttendance(
        studentId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get my attendance (for logged-in student)
  static async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { startDate, endDate } = req.query;
      const user = await AuthService.getCurrentUser(req.userId);
      
      const attendance = await AuthService.getAttendance(
        user.studentId!,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get attendance summary
  static async getAttendanceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const summary = await AuthService.getAttendanceSummary(studentId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all attendance (admin only)
  static async getAllAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const department = req.query.department as string;
      
      const result = await AuthService.getAllAttendance(page, limit, date, department);
      
      res.json({
        success: true,
        data: result.attendance,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== FEES CONTROLLERS ====================
  
  // Create fee record
  static async createFeeRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, amount, dueDate, feeType, semester } = req.body;
      const feeRecord = await AuthService.createFeeRecord(
        studentId,
        amount,
        dueDate,
        feeType,
        semester
      );
      
      res.json({
        success: true,
        message: 'Fee record created successfully',
        data: feeRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  // Pay fees
  static async payFees(req: Request, res: Response, next: NextFunction) {
    try {
      const { feeId } = req.params;
      const { amount, paymentMethod, transactionId } = req.body;
      
      const payment = await AuthService.payFees(
        feeId,
        amount,
        paymentMethod,
        transactionId
      );
      
      res.json({
        success: true,
        message: 'Fee payment successful',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get fees by student ID
  static async getFeesByStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const fees = await AuthService.getFeesByStudent(studentId);
      
      res.json({
        success: true,
        data: fees,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get my fees (for logged-in student)
  static async getMyFees(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const user = await AuthService.getCurrentUser(req.userId);
      const fees = await AuthService.getFeesByStudent(user.studentId!);
      
      res.json({
        success: true,
        data: fees,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get fee summary
  static async getFeeSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const summary = await AuthService.getFeeSummary(studentId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all fees (admin only)
  static async getAllFees(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const department = req.query.department as string;
      
      const result = await AuthService.getAllFees(page, limit, status, department);
      
      res.json({
        success: true,
        data: result.fees,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get fee statistics
  static async getFeeStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AuthService.getFeeStatistics();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== NOTIFICATION CONTROLLERS ====================
  
  // Create notification
  static async createNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, type, title, message, data } = req.body;
      const notification = await AuthService.createNotification(
        userId,
        type,
        title,
        message,
        data
      );
      
      res.json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get my notifications
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const result = await AuthService.getNotifications(
        req.userId,
        page,
        limit,
        unreadOnly
      );
      
      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
        unreadCount: result.unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark notification as read
  static async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params;
      const notification = await AuthService.markNotificationRead(notificationId);
      
      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const count = await AuthService.markAllNotificationsRead(req.userId);
      
      res.json({
        success: true,
        message: `${count} notifications marked as read`,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete notification
  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params;
      await AuthService.deleteNotification(notificationId);
      
      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const preferences = await AuthService.getNotificationPreferences(req.userId);
      
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { emailNotifications, pushNotifications, inAppNotifications, preferences } = req.body;
      const updated = await AuthService.updateNotificationPreferences(
        req.userId,
        { emailNotifications, pushNotifications, inAppNotifications, preferences }
      );
      
      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // Broadcast notification to all students (admin only)
  static async broadcastNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, title, message, department, data } = req.body;
      const result = await AuthService.broadcastNotification(
        type,
        title,
        message,
        department,
        data
      );
      
      res.json({
        success: true,
        message: `Notification broadcast to ${result.count} students`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SESSION MANAGEMENT ====================
  
  // Get active sessions
  static async getActiveSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const sessions = await AuthService.getActiveSessions(req.userId);
      
      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  // Revoke session
  static async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const { sessionId } = req.params;
      await AuthService.revokeSession(req.userId, sessionId);
      
      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Revoke all sessions
  static async revokeAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError(401, 'Not authenticated');
      }
      
      const currentSessionToken = req.headers.authorization?.substring(7);
      await AuthService.revokeAllSessions(req.userId, currentSessionToken);
      
      res.json({
        success: true,
        message: 'All other sessions revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN USER MANAGEMENT ====================
  
  // Get all users (admin only)
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const search = req.query.search as string;
      
      const result = await AuthService.getAllUsers(page, limit, role, search);
      
      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID (admin only)
  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await AuthService.getUserById(id);
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user role (admin only)
  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.userId!;
      
      const user = await AuthService.updateUserRole(id, role, adminId);
      
      res.json({
        success: true,
        message: 'User role updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Deactivate user (admin only)
  static async deactivateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.userId!;
      
      const user = await AuthService.deactivateUser(id, adminId);
      
      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Activate user (admin only)
  static async activateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.userId!;
      
      const user = await AuthService.activateUser(id, adminId);
      
      res.json({
        success: true,
        message: 'User activated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete user (admin only)
  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.userId!;
      
      await AuthService.deleteUser(id, adminId);
      
      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}