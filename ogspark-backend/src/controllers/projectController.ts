import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/projectService';
import { AppError } from '../utils/helpers';
import { PAGINATION } from '../utils/constants';

export class ProjectController {
  static async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      const userId = req.userId!;

      const project = await ProjectService.createProject(userId, name, description);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
      const limit = parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT;
      const status = req.query.status as string | undefined;

      const result = await ProjectService.getProjects(userId, page, limit, status);

      res.json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const project = await ProjectService.getProjectById(id, userId);

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const updates = req.body;

      const project = await ProjectService.updateProject(id, userId, updates);

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      await ProjectService.deleteProject(id, userId);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProjectStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const stats = await ProjectService.getProjectStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}