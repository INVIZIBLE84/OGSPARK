import { z } from 'zod';

export const userValidation = {
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
};

export const analyticsValidation = {
  projectGrowth: z.object({
    query: z.object({
      timeframe: z.enum(['week', 'month', 'year']).optional(),
    }),
  }),
};