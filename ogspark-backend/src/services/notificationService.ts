import { prisma } from '../config/database';
import { CacheService } from './cacheService';
import logger from '../utils/logger';

export class NotificationService {
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

    // Clear cache
    await CacheService.deletePattern(`notifications:${userId}:*`);

    logger.info('Notification created:', { notificationId: notification.id, userId, type });

    return notification;
  }

  static async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    type?: string
  ) {
    const cacheKey = `notifications:${userId}:${page}:${limit}:${unreadOnly}:${type}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }
    if (type) {
      where.type = type;
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
    const result = {
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

    await CacheService.set(cacheKey, result, 60); // Cache for 1 minute

    return result;
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Clear cache
    await CacheService.deletePattern(`notifications:${userId}:*`);

    return updated;
  }

  static async markAllAsRead(userId: string) {
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

    // Clear cache
    await CacheService.deletePattern(`notifications:${userId}:*`);

    return result.count;
  }

  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    // Clear cache
    await CacheService.deletePattern(`notifications:${userId}:*`);
  }

  static async deleteAllNotifications(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId },
    });

    // Clear cache
    await CacheService.deletePattern(`notifications:${userId}:*`);
  }

  static async getNotificationPreferences(userId: string) {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    return {
      emailNotifications: settings?.emailNotifications ?? true,
      pushNotifications: settings?.pushNotifications ?? true,
      inAppNotifications: settings?.inAppNotifications ?? true,
      notificationTypes: settings?.notificationPreferences || {
        attendance: true,
        fees: true,
        announcements: true,
        projects: true,
        tasks: true,
        comments: true,
      },
    };
  }

  static async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      inAppNotifications?: boolean;
      notificationTypes?: any;
    }
  ) {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        inAppNotifications: preferences.inAppNotifications,
        notificationPreferences: preferences.notificationTypes,
      },
      create: {
        userId,
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        inAppNotifications: preferences.inAppNotifications ?? true,
        notificationPreferences: preferences.notificationTypes || {},
      },
    });

    return settings;
  }

  static async broadcastToDepartment(
    department: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ) {
    const students = await prisma.user.findMany({
      where: {
        department,
        studentId: { not: null },
        isActive: true,
      },
      select: { id: true },
    });

    const notifications = await prisma.notification.createMany({
      data: students.map(student => ({
        userId: student.id,
        type,
        title,
        message,
        data: data || {},
      })),
    });

    logger.info('Broadcast notification sent:', { department, count: notifications.count });

    return {
      count: notifications.count,
      message: `Notification sent to ${notifications.count} students in ${department}`,
    };
  }

  static async broadcastToAll(
    type: string,
    title: string,
    message: string,
    data?: any
  ) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Create in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await prisma.notification.createMany({
        data: batch.map(user => ({
          userId: user.id,
          type,
          title,
          message,
          data: data || {},
        })),
      });
    }

    logger.info('Broadcast notification sent to all:', { count: users.length });

    return {
      count: users.length,
      message: `Notification sent to ${users.length} users`,
    };
  }

  static async getNotificationStats(userId: string) {
    const [total, unread, byType] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      total,
      unread,
      read: total - unread,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
      })),
    };
  }
}