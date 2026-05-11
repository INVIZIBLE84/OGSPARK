import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  
  DATABASE_URL: z.string().url(),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_PATH: z.string().default('./uploads'),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;