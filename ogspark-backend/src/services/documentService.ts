import { prisma } from '../config/database';
import { AppError } from '../utils/helpers';
import logger from '../utils/logger';
import { CacheService } from './cacheService';
import { NotificationService } from './notificationService';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config';

export class DocumentService {
  private static uploadDir = path.join(config.UPLOAD_PATH || './uploads', 'documents');

  static async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    title: string,
    description?: string,
    category?: string,
    isPublic: boolean = false,
    department?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const document = await prisma.document.create({
      data: {
        title,
        description,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        userId,
        category,
        isPublic,
        department: isPublic ? department : null,
      },
      include: {
        user: {
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
    await CacheService.deletePattern('documents:*');

    logger.info('Document uploaded:', { documentId: document.id, userId, title });

    return document;
  }

  static async getDocuments(
    userId: string,
    page: number = 1,
    limit: number = 20,
    category?: string,
    department?: string,
    isPublic?: boolean
  ) {
    const cacheKey = `documents:${userId}:${page}:${limit}:${category}:${department}:${isPublic}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (category) where.category = category;
    
    if (isPublic) {
      where.isPublic = true;
      if (department) where.department = department;
    } else {
      where.OR = [
        { userId },
        { isPublic: true },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const result = {
      documents,
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

  static async getDocumentById(documentId: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    // Check access
    if (!document.isPublic && document.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user?.role !== 'ADMIN') {
        throw new AppError(403, 'Access denied');
      }
    }

    // Increment download count
    await prisma.document.update({
      where: { id: documentId },
      data: { downloadCount: { increment: 1 } },
    });

    return document;
  }

  static async updateDocument(
    documentId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      category?: string;
      isPublic?: boolean;
    }
  ) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found or access denied');
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updates,
    });

    // Clear cache
    await CacheService.deletePattern('documents:*');

    logger.info('Document updated:', { documentId, userId });

    return updated;
  }

  static async deleteDocument(documentId: string, userId: string) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found or access denied');
    }

    // Delete physical file
    try {
      await fs.unlink(document.path);
    } catch (error) {
      logger.error('Failed to delete physical file:', error);
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    // Clear cache
    await CacheService.deletePattern('documents:*');

    logger.info('Document deleted:', { documentId, userId });
  }

  static async getDocumentCategories() {
    const categories = await prisma.document.groupBy({
      by: ['category'],
      _count: true,
    });

    return categories
      .filter(c => c.category)
      .map(c => ({
        name: c.category,
        count: c._count,
      }));
  }

  static async getDocumentStats(userId: string) {
    const [total, byCategory, totalSize, publicCount] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.document.groupBy({
        by: ['category'],
        where: { userId },
        _count: true,
      }),
      prisma.document.aggregate({
        where: { userId },
        _sum: { size: true },
      }),
      prisma.document.count({
        where: { userId, isPublic: true },
      }),
    ]);

    return {
      total,
      public: publicCount,
      private: total - publicCount,
      totalSizeMB: ((totalSize._sum.size || 0) / (1024 * 1024)).toFixed(2),
      byCategory: byCategory
        .filter(c => c.category)
        .map(c => ({
          category: c.category,
          count: c._count,
        })),
    };
  }
}