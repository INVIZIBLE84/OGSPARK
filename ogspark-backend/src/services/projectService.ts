import { prisma } from '../config/database';
import { AppError } from '../utils/helpers';
import { PAGINATION } from '../utils/constants';
import logger from '../utils/logger';

export class ProjectService {
  static async createProject(userId: string, name: string, description?: string) {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Project created:', { projectId: project.id, userId });

    return project;
  }

  static async getProjects(
    userId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_LIMIT,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
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
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      projects,
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

  static async getProjectById(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId, // Ensure user owns the project
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    return project;
  }

  static async updateProject(
    projectId: string,
    userId: string,
    updates: { name?: string; description?: string; status?: string }
  ) {
    // Verify project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new AppError(404, 'Project not found');
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updates,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Project updated:', { projectId, userId });

    return project;
  }

  static async deleteProject(projectId: string, userId: string) {
    // Verify project exists and user owns it
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new AppError(404, 'Project not found');
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    logger.info('Project deleted:', { projectId, userId });
  }

  static async getProjectStats(userId: string) {
    const stats = await prisma.project.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        _all: true,
      },
    });

    const total = await prisma.project.count({ where: { userId } });

    return {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count._all;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}