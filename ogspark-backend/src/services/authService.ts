import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { prisma } from '../config/database';
import { hashPassword, verifyPassword, AppError } from '../utils/helpers';
import { AuthToken } from '../middleware/auth';
import logger from '../utils/logger';
import { randomBytes } from 'crypto';
import { addHours, isAfter, startOfDay, endOfDay, format } from 'date-fns';

export class AuthService {
  // ==================== TOKEN MANAGEMENT ====================
  
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });
  }

  static generateRefreshToken(): string {
    return randomBytes(40).toString('hex');
  }

  // ==================== REGISTRATION ====================
  
  static async register(email: string, password: string, name: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: addHours(new Date(), 168), // 7 days
      },
    });

    logger.info('New user registered:', { userId: user.id, email });

    return { user, token, refreshToken };
  }

  static async registerStudent(
    email: string,
    password: string,
    name: string,
    department: string,
    dateOfBirth?: Date,
    phoneNumber?: string,
    address?: string
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    const validDepartments = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'];
    if (!validDepartments.includes(department.toUpperCase())) {
      throw new AppError(400, 'Invalid department');
    }

    const studentId = await this.generateStudentId(department);
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        studentId,
        department: department.toUpperCase(),
        role: 'USER',
        dateOfBirth,
        phoneNumber,
        address,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        department: true,
        dateOfBirth: true,
        phoneNumber: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: addHours(new Date(), 168),
      },
    });

    // Send verification email
    await this.sendVerificationEmail(user.id);

    logger.info('Student registered:', {
      userId: user.id,
      email: user.email,
      studentId: user.studentId,
      department: user.department,
    });

    return { user, token, refreshToken };
  }

  private static async generateStudentId(department: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const deptCode = department.substring(0, 3).toUpperCase();

    const lastStudent = await prisma.user.findFirst({
      where: {
        studentId: {
          startsWith: `${deptCode}-${year}-${month}-`,
        },
      },
      orderBy: {
        studentId: 'desc',
      },
    });

    let sequence = '0001';
    if (lastStudent?.studentId) {
      const lastSequence = lastStudent.studentId.split('-').pop();
      if (lastSequence) {
        const nextNumber = parseInt(lastSequence) + 1;
        sequence = String(nextNumber).padStart(4, '0');
      }
    }

    return `${deptCode}-${year}-${month}-${sequence}`;
  }

  // ==================== LOGIN/LOGOUT ====================
  
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(401, 'Account is deactivated');
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: addHours(new Date(), 168),
      },
    });

    logger.info('User logged in:', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
      token,
      refreshToken,
    };
  }

  static async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
    logger.info('User logged out:', { token: token.substring(0, 10) + '...' });
  }

  static async refreshToken(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || isAfter(new Date(), session.expiresAt)) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const newToken = this.generateToken(session.userId);
    const newRefreshToken = this.generateRefreshToken();

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newRefreshToken,
        expiresAt: addHours(new Date(), 168),
      },
    });

    return { token: newToken, refreshToken: newRefreshToken };
  }

  // ==================== PASSWORD RESET ====================
  
  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 1);

    await prisma.passwordReset.upsert({
      where: { email },
      update: {
        token: resetToken,
        expiresAt,
      },
      create: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    // In production, send email here
    logger.info('Password reset token generated:', { email, token: resetToken });

    return {
      message: 'Password reset email sent',
      resetToken, // Only return in development
      resetUrl: `${config.FRONTEND_URL}/reset-password?token=${resetToken}`,
    };
  }

  static async resetPassword(token: string, newPassword: string) {
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRequest || isAfter(new Date(), resetRequest.expiresAt)) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email: resetRequest.email },
      data: { password: hashedPassword },
    });

    await prisma.passwordReset.delete({
      where: { id: resetRequest.id },
    });

    // Revoke all sessions for security
    await prisma.session.deleteMany({
      where: {
        user: { email: resetRequest.email },
      },
    });

    logger.info('Password reset successfully:', { email: resetRequest.email });

    return { message: 'Password reset successfully' };
  }

  // ==================== EMAIL VERIFICATION ====================
  
  static async sendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.isEmailVerified) {
      throw new AppError(400, 'Email already verified');
    }

    const verificationToken = randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 24);

    await prisma.emailVerification.upsert({
      where: { userId },
      update: {
        token: verificationToken,
        expiresAt,
      },
      create: {
        userId,
        token: verificationToken,
        expiresAt,
      },
    });

    logger.info('Verification email sent:', { email: user.email, token: verificationToken });

    return {
      message: 'Verification email sent',
      verificationUrl: `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`,
    };
  }

  static async verifyEmail(token: string) {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || isAfter(new Date(), verification.expiresAt)) {
      throw new AppError(400, 'Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    });

    await prisma.emailVerification.delete({
      where: { id: verification.id },
    });

    logger.info('Email verified:', { email: verification.user.email });

    return { message: 'Email verified successfully' };
  }

  // ==================== PROFILE MANAGEMENT ====================
  
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        department: true,
        dateOfBirth: true,
        phoneNumber: true,
        address: true,
        role: true,
        avatar: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  static async updateProfile(userId: string, updates: {
    name?: string;
    avatar?: string;
    phoneNumber?: string;
    address?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        updatedAt: true,
      },
    });

    logger.info('Profile updated:', { userId });

    return user;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError(400, 'Current password is incorrect');
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    logger.info('Password changed:', { userId });

    return { message: 'Password changed successfully' };
  }

  static async updateStudentProfile(userId: string, updates: {
    name?: string;
    avatar?: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: Date;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        name: true,
        studentId: true,
        department: true,
        dateOfBirth: true,
        phoneNumber: true,
        address: true,
        avatar: true,
      },
    });

    logger.info('Student profile updated:', { userId, studentId: user.studentId });

    return user;
  }

  // ==================== STUDENT MANAGEMENT ====================
  
  static async getUserByStudentId(studentId: string) {
    const user = await prisma.user.findUnique({
      where: { studentId },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        department: true,
        dateOfBirth: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'Student not found');
    }

    return user;
  }

  static async getStudentsByDepartment(department: string) {
    const students = await prisma.user.findMany({
      where: {
        department: department.toUpperCase(),
        studentId: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        department: true,
        phoneNumber: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return students;
  }

  static async getAllStudents(page: number = 1, limit: number = 10, department?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      studentId: { not: null },
    };

    if (department) {
      where.department = department.toUpperCase();
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          department: true,
          phoneNumber: true,
          dateOfBirth: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getStudentStats() {
    const [totalStudents, studentsByDepartment, activeStudents, verifiedStudents] = await Promise.all([
      prisma.user.count({ where: { studentId: { not: null } } }),
      prisma.user.groupBy({
        by: ['department'],
        where: { studentId: { not: null } },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { studentId: { not: null }, isActive: true } }),
      prisma.user.count({ where: { studentId: { not: null }, isEmailVerified: true } }),
    ]);

    return {
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      verifiedStudents,
      unverifiedStudents: totalStudents - verifiedStudents,
      byDepartment: studentsByDepartment.reduce((acc, item) => {
        acc[item.department || 'OTHER'] = item._count._all;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  static async checkStudentIdExists(studentId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { studentId },
      select: { id: true },
    });
    return !!user;
  }

  // ==================== ATTENDANCE MANAGEMENT ====================
  
  static async markAttendance(
    userId: string,
    date: Date,
    status: 'PRESENT' | 'ABSENT' | 'LATE',
    subject?: string,
    remarks?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.studentId) {
      throw new AppError(404, 'Student not found');
    }

    // Check if attendance already marked for this date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: user.studentId,
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
    });

    if (existingAttendance) {
      throw new AppError(400, 'Attendance already marked for this date');
    }

    const attendance = await prisma.attendance.create({
      data: {
        studentId: user.studentId,
        date,
        status,
        subject,
        remarks,
        markedBy: userId,
      },
    });

    logger.info('Attendance marked:', { studentId: user.studentId, date, status });

    return attendance;
  }

  static async getAttendance(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = { studentId };

    if (startDate) {
      where.date = { ...where.date, gte: startOfDay(startDate) };
    }
    if (endDate) {
      where.date = { ...where.date, lte: endOfDay(endDate) };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return attendance;
  }

  static async getAttendanceSummary(studentId: string) {
    const attendance = await prisma.attendance.findMany({
      where: { studentId },
    });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;

    const percentage = total > 0 ? (present / total) * 100 : 0;

    return {
      totalDays: total,
      present,
      absent,
      late,
      attendancePercentage: percentage.toFixed(2),
    };
  }

  static async getAllAttendance(
    page: number = 1,
    limit: number = 10,
    date: Date = new Date(),
    department?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    };

    if (department) {
      where.student = {
        department: department.toUpperCase(),
      };
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              name: true,
              studentId: true,
              department: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      attendance,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ==================== FEES MANAGEMENT ====================
  
  static async createFeeRecord(
    studentId: string,
    amount: number,
    dueDate: Date,
    feeType: string,
    semester?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { studentId },
    });

    if (!user) {
      throw new AppError(404, 'Student not found');
    }

    const feeRecord = await prisma.fee.create({
      data: {
        studentId,
        amount,
        dueDate,
        feeType,
        semester,
        status: 'PENDING',
      },
    });

    logger.info('Fee record created:', { studentId, amount, feeType });

    return feeRecord;
  }

  static async payFees(
    feeId: string,
    amount: number,
    paymentMethod: string,
    transactionId?: string
  ) {
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
    });

    if (!fee) {
      throw new AppError(404, 'Fee record not found');
    }

    if (fee.status === 'PAID') {
      throw new AppError(400, 'Fee already paid');
    }

    const payment = await prisma.feePayment.create({
      data: {
        feeId,
        amount,
        paymentMethod,
        transactionId,
        status: 'COMPLETED',
        paymentDate: new Date(),
      },
    });

    await prisma.fee.update({
      where: { id: feeId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentId: payment.id,
      },
    });

    logger.info('Fee payment processed:', { feeId, amount, paymentMethod });

    return payment;
  }

  static async getFeesByStudent(studentId: string) {
    const fees = await prisma.fee.findMany({
      where: { studentId },
      include: {
        payment: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    return fees;
  }

  static async getFeeSummary(studentId: string) {
    const fees = await prisma.fee.findMany({
      where: { studentId },
    });

    const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const paidAmount = fees
      .filter(fee => fee.status === 'PAID')
      .reduce((sum, fee) => sum + fee.amount, 0);
    const pendingAmount = totalAmount - paidAmount;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      totalFees: fees.length,
      paidFees: fees.filter(f => f.status === 'PAID').length,
      pendingFees: fees.filter(f => f.status === 'PENDING').length,
    };
  }

  static async getAllFees(
    page: number = 1,
    limit: number = 10,
    status?: string,
    department?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (department) {
      where.student = {
        department: department.toUpperCase(),
      };
    }

    const [fees, total] = await Promise.all([
      prisma.fee.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            select: {
              name: true,
              studentId: true,
              department: true,
            },
          },
          payment: true,
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.fee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      fees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getFeeStatistics() {
    const [totalFees, paidFees, pendingFees, overdueFees] = await Promise.all([
      prisma.fee.count(),
      prisma.fee.count({ where: { status: 'PAID' } }),
      prisma.fee.count({ where: { status: 'PENDING' } }),
      prisma.fee.count({
        where: {
          status: 'PENDING',
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const totalAmount = await prisma.fee.aggregate({
      _sum: { amount: true },
    });

    const paidAmount = await prisma.fee.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    });

    return {
      totalFees,
      paidFees,
      pendingFees,
      overdueFees,
      totalAmount: totalAmount._sum.amount || 0,
      paidAmount: paidAmount._sum.amount || 0,
      pendingAmount: (totalAmount._sum.amount || 0) - (paidAmount._sum.amount || 0),
    };
  }

  // ==================== NOTIFICATION MANAGEMENT ====================
  
  static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
      },
    });

    return notification;
  }

  static async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async markNotificationRead(notificationId: string) {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return notification;
  }

  static async markAllNotificationsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  static async deleteNotification(notificationId: string) {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  static async getNotificationPreferences(userId: string) {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    return {
      emailNotifications: settings?.emailNotifications ?? true,
      pushNotifications: settings?.pushNotifications ?? true,
      inAppNotifications: settings?.inAppNotifications ?? true,
      preferences: settings?.notificationPreferences || {},
    };
  }

  static async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      inAppNotifications?: boolean;
      preferences?: any;
    }
  ) {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });

    return settings;
  }

  static async broadcastNotification(
    type: string,
    title: string,
    message: string,
    department?: string,
    data?: any
  ) {
    const where: any = { isActive: true };
    if (department) {
      where.department = department.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const notifications = await prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type,
        title,
        message,
        data: data || {},
      })),
    });

    logger.info('Broadcast notification sent:', { type, count: notifications.count, department });

    return {
      count: notifications.count,
      message: `Notification sent to ${notifications.count} users`,
    };
  }

  // ==================== SESSION MANAGEMENT ====================
  
  static async getActiveSessions(userId: string) {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  static async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    logger.info('Session revoked:', { userId, sessionId });
  }

  static async revokeAllSessions(userId: string, currentSessionToken?: string) {
    const where: any = { userId };

    if (currentSessionToken) {
      where.token = { not: currentSessionToken };
    }

    const result = await prisma.session.deleteMany({
      where,
    });

    logger.info('All sessions revoked:', { userId, count: result.count });

    return result.count;
  }

  // ==================== ADMIN USER MANAGEMENT ====================
  
  static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    role?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          studentId: true,
          department: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        department: true,
        dateOfBirth: true,
        phoneNumber: true,
        address: true,
        role: true,
        avatar: true,
        isActive: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  static async updateUserRole(userId: string, role: string, adminId: string) {
    const validRoles = ['USER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new AppError(400, 'Invalid role');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    logger.info('User role updated:', { userId, role, updatedBy: adminId });

    return user;
  }

  static async deactivateUser(userId: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Revoke all sessions for deactivated user
    await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info('User deactivated:', { userId, deactivatedBy: adminId });

    return user;
  }

  static async activateUser(userId: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    logger.info('User activated:', { userId, activatedBy: adminId });

    return user;
  }

  static async deleteUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.role === 'ADMIN') {
      throw new AppError(403, 'Cannot delete admin users');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('User deleted:', { userId, deletedBy: adminId });
  }
}