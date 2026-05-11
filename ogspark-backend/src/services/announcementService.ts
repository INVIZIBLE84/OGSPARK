import { prisma } from '../config/database';
import { AppError } from '../utils/helpers';
import logger from '../utils/logger';
import { CacheService } from './cacheService';
import { NotificationService } from './notificationService';
import { startOfDay, endOfDay, isAfter } from 'date-fns';

export class AnnouncementService {
  static async createAnnouncement(
    userId: string,
    title: string,
    content: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM',
    targetDepartments?: string[],
    expiresAt?: Date,
    attachments?: any[]
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AppError(403, 'Only admins can create announcements');
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority,
        createdBy: userId,
        targetDepartments: targetDepartments || [],
        expiresAt,
        attachments: attachments || [],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Send notifications to targeted users
    const users = await this.getTargetUsers(targetDepartments);
    
    await NotificationService.broadcastToAll(
      'ANNOUNCEMENT',
      title,
      content,
      {
        announcementId: announcement.id,
        priority,
        expiresAt,
      }
    );

    // Clear cache
    await CacheService.deletePattern('announcements:*');

    logger.info('Announcement created:', { announcementId: announcement.id, userId, title });

    return announcement;
  }

  static async getAnnouncements(
    userId: string,
    page: number = 1,
    limit: number = 20,
    priority?: string,
    department?: string
  ) {
    const cacheKey = `announcements:${userId}:${page}:${limit}:${priority}:${department}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const where: any = {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (priority) where.priority = priority;

    if (user?.role !== 'ADMIN') {
      where.OR.push(
        { targetDepartments: { array_contains: user?.department } },
        { targetDepartments: { equals: [] } }
      );
    }

    if (department && user?.role === 'ADMIN') {
      where.targetDepartments = { array_contains: department };
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.announcement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const result = {
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await CacheService.set(cacheKey, result, 300);

    return result;
  }

  static async getAnnouncementById(announcementId: string, userId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new AppError(404, 'Announcement not found');
    }

    // Check if expired
    if (announcement.expiresAt && isAfter(new Date(), announcement.expiresAt)) {
      throw new AppError(410, 'Announcement has expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Check if user has access
    if (user?.role !== 'ADMIN') {
      if (announcement.targetDepartments.length > 0 && 
          !announcement.targetDepartments.includes(user?.department || '')) {
        throw new AppError(403, 'Access denied');
      }
    }

    // Increment view count
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { viewCount: { increment: 1 } },
    });

    return announcement;
  }

  static async updateAnnouncement(
    announcementId: string,
    userId: string,
    updates: {
      title?: string;
      content?: string;
      priority?: string;
      targetDepartments?: string[];
      expiresAt?: Date | null;
    }
  ) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new AppError(404, 'Announcement not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'ADMIN') {
      throw new AppError(403, 'Only admins can update announcements');
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: updates,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Clear cache
    await CacheService.deletePattern('announcements:*');

    logger.info('Announcement updated:', { announcementId, userId });

    return updated;
  }

  static async deleteAnnouncement(announcementId: string, userId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new AppError(404, 'Announcement not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'ADMIN') {
      throw new AppError(403, 'Only admins can delete announcements');
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    // Clear cache
    await CacheService.deletePattern('announcements:*');

    logger.info('Announcement deleted:', { announcementId, userId });
  }

  static async getAnnouncementStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'ADMIN') {
      throw new AppError(403, 'Only admins can view announcement stats');
    }

    const [total, active, expired, byPriority] = await Promise.all([
      prisma.announcement.count(),
      prisma.announcement.count({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      prisma.announcement.count({
        where: {
          expiresAt: { lt: new Date() },
        },
      }),
      prisma.announcement.groupBy({
        by: ['priority'],
        _count: true,
      }),
    ]);

    return {
      total,
      active,
      expired,
      byPriority: byPriority.map(p => ({
        priority: p.priority,
        count: p._count,
      })),
    };
  }

  private static async getTargetUsers(departments?: string[]) {
    if (!departments || departments.length === 0) {
      return prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
    }

    return prisma.user.findMany({
      where: {
        department: { in: departments },
        isActive: true,
      },
      select: { id: true },
    });
  }
}