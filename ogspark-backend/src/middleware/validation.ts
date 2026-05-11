import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../utils/helpers';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        next(new AppError(400, `Validation error: ${JSON.stringify(errorMessages)}`));
      } else {
        next(error);
      }
    }
  };
};

// User validation schemas
export const userSchemas = {
  updateProfile: z.object({
    body: z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
      avatar: z.string().url('Invalid avatar URL').optional(),
    }),
  }),
  
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
      confirmPassword: z.string().min(6, 'Confirm password is required'),
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "New passwords don't match",
      path: ["confirmPassword"],
    }),
  }),
  
  updateRole: z.object({
    body: z.object({
      role: z.enum(['USER', 'ADMIN']),
    }),
    params: z.object({
      id: z.string().min(1, 'User ID is required'),
    }),
  }),
  
  userId: z.object({
    params: z.object({
      id: z.string().min(1, 'User ID is required'),
    }),
  }),
};

// Authentication validation schemas
export const authSchemas = {
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
    }),
  }),
  
  // Student registration schema
  registerStudent: z.object({
    body: z.object({
      email: z.string()
        .email('Invalid email format')
        .min(5, 'Email must be at least 5 characters')
        .max(100, 'Email must be less than 100 characters'),
      
      password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(50, 'Password must be less than 50 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      
      confirmPassword: z.string()
        .min(6, 'Confirm password must be at least 6 characters'),
      
      name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
      
      department: z.enum(['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER'], {
        errorMap: () => ({ message: 'Please select a valid department' }),
      }),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }),
  }),
  
  refreshToken: z.object({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),
  
  forgotPassword: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
    }),
  }),
  
  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, 'Reset token is required'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().min(6, 'Confirm password is required'),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }),
  }),
};

// Project validation schemas
export const projectSchemas = {
  create: z.object({
    body: z.object({
      name: z.string()
        .min(1, 'Project name is required')
        .max(100, 'Project name must be less than 100 characters'),
      description: z.string()
        .max(500, 'Description must be less than 500 characters')
        .optional(),
    }),
  }),
  
  update: z.object({
    body: z.object({
      name: z.string()
        .min(1, 'Project name is required')
        .max(100, 'Project name must be less than 100 characters')
        .optional(),
      description: z.string()
        .max(500, 'Description must be less than 500 characters')
        .optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
    }),
    params: z.object({
      id: z.string().min(1, 'Project ID is required'),
    }),
  }),
  
  projectId: z.object({
    params: z.object({
      id: z.string().min(1, 'Project ID is required'),
    }),
  }),
  
  list: z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
      status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
      search: z.string().optional(),
    }),
  }),
};

// Task validation schemas
export const taskSchemas = {
  create: z.object({
    body: z.object({
      title: z.string()
        .min(1, 'Task title is required')
        .max(200, 'Task title must be less than 200 characters'),
      description: z.string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      assignedTo: z.string().optional(),
      dueDate: z.string()
        .datetime('Invalid date format')
        .optional()
        .transform(val => val ? new Date(val) : undefined),
    }),
    params: z.object({
      projectId: z.string().min(1, 'Project ID is required'),
    }),
  }),
  
  update: z.object({
    body: z.object({
      title: z.string()
        .min(1, 'Task title is required')
        .max(200, 'Task title must be less than 200 characters')
        .optional(),
      description: z.string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assignedTo: z.string().optional().nullable(),
      dueDate: z.string()
        .datetime('Invalid date format')
        .optional()
        .nullable()
        .transform(val => val ? new Date(val) : null),
    }),
    params: z.object({
      id: z.string().min(1, 'Task ID is required'),
    }),
  }),
  
  taskId: z.object({
    params: z.object({
      id: z.string().min(1, 'Task ID is required'),
    }),
  }),
  
  list: z.object({
    params: z.object({
      projectId: z.string().min(1, 'Project ID is required'),
    }),
    query: z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      assignedTo: z.string().optional(),
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    }),
  }),
};

// Comment validation schemas
export const commentSchemas = {
  create: z.object({
    body: z.object({
      content: z.string()
        .min(1, 'Comment content is required')
        .max(1000, 'Comment must be less than 1000 characters'),
      taskId: z.string().optional(),
      projectId: z.string().optional(),
      parentId: z.string().optional(),
    }).refine(
      (data) => data.taskId || data.projectId,
      {
        message: 'Either taskId or projectId is required',
        path: ['taskId', 'projectId'],
      }
    ),
  }),
  
  update: z.object({
    body: z.object({
      content: z.string()
        .min(1, 'Comment content is required')
        .max(1000, 'Comment must be less than 1000 characters'),
    }),
    params: z.object({
      id: z.string().min(1, 'Comment ID is required'),
    }),
  }),
  
  commentId: z.object({
    params: z.object({
      id: z.string().min(1, 'Comment ID is required'),
    }),
  }),
};

// File validation schemas
export const fileSchemas = {
  upload: z.object({
    params: z.object({
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }).refine(
      (data) => data.projectId || data.taskId,
      {
        message: 'Either projectId or taskId is required',
      }
    ),
    query: z.object({
      isPublic: z.string().optional().transform(val => val === 'true'),
    }),
  }),
  
  fileId: z.object({
    params: z.object({
      id: z.string().min(1, 'File ID is required'),
    }),
  }),
};

// Project member validation schemas
export const memberSchemas = {
  addMember: z.object({
    body: z.object({
      userId: z.string().min(1, 'User ID is required'),
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
    }),
    params: z.object({
      projectId: z.string().min(1, 'Project ID is required'),
    }),
  }),
  
  updateMemberRole: z.object({
    body: z.object({
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
    }),
    params: z.object({
      projectId: z.string().min(1, 'Project ID is required'),
      userId: z.string().min(1, 'User ID is required'),
    }),
  }),
  
  removeMember: z.object({
    params: z.object({
      projectId: z.string().min(1, 'Project ID is required'),
      userId: z.string().min(1, 'User ID is required'),
    }),
  }),
};

// Analytics validation schemas
export const analyticsSchemas = {
  projectGrowth: z.object({
    query: z.object({
      timeframe: z.enum(['week', 'month', 'year']).optional().default('month'),
    }),
  }),
  
  userActivity: z.object({
    params: z.object({
      userId: z.string().optional(),
    }),
    query: z.object({
      days: z.string()
        .optional()
        .transform(val => val ? parseInt(val) : 7),
    }),
  }),
  
  dateRange: z.object({
    query: z.object({
      startDate: z.string()
        .datetime('Invalid start date')
        .transform(val => new Date(val)),
      endDate: z.string()
        .datetime('Invalid end date')
        .transform(val => new Date(val)),
    }).refine(
      (data) => data.startDate <= data.endDate,
      {
        message: 'Start date must be before or equal to end date',
        path: ['startDate'],
      }
    ),
  }),
};

// Notification validation schemas
export const notificationSchemas = {
  markAsRead: z.object({
    params: z.object({
      id: z.string().min(1, 'Notification ID is required'),
    }),
  }),
  
  markAllAsRead: z.object({
    body: z.object({}).optional(),
  }),
  
  list: z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
      unreadOnly: z.string().optional().transform(val => val === 'true'),
    }),
  }),
};

// Settings validation schemas
export const settingsSchemas = {
  update: z.object({
    body: z.object({
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      notificationsEnabled: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      language: z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh']).optional(),
      timezone: z.string().optional(),
      preferences: z.record(z.any()).optional(),
    }),
  }),
};

// API Key validation schemas
export const apiKeySchemas = {
  create: z.object({
    body: z.object({
      name: z.string()
        .min(1, 'API key name is required')
        .max(50, 'Name must be less than 50 characters'),
      expiresIn: z.enum(['30d', '60d', '90d', 'never']).optional().default('never'),
    }),
  }),
  
  update: z.object({
    body: z.object({
      name: z.string()
        .min(1, 'API key name is required')
        .max(50, 'Name must be less than 50 characters')
        .optional(),
      isActive: z.boolean().optional(),
    }),
    params: z.object({
      id: z.string().min(1, 'API key ID is required'),
    }),
  }),
  
  apiKeyId: z.object({
    params: z.object({
      id: z.string().min(1, 'API key ID is required'),
    }),
  }),
};

// Pagination validation schema (reusable)
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    type: z.enum(['projects', 'tasks', 'users', 'all']).optional().default('all'),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  }),
});