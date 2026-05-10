import api from '../lib/api';
import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  description: z.string().optional(),
  // Add other project fields as per your backend schema
});

export const createProjectSchema = projectSchema.omit({ id: true });
export const updateProjectSchema = projectSchema.partial();

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectPayload = z.infer<typeof createProjectSchema>;
export type UpdateProjectPayload = z.infer<typeof updateProjectSchema>;

export const ProjectService = {
  getProjects: async () => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  getProject: async (id: string) => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (payload: CreateProjectPayload) => {
    const response = await api.post<Project>('/projects', payload);
    return response.data;
  },

  updateProject: async (id: string, payload: UpdateProjectPayload) => {
    const response = await api.put<Project>(`/projects/${id}`, payload);
    return response.data;
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
  },

  getProjectStats: async () => {
    const response = await api.get<any>('/projects/stats');
    return response.data;
  },
};

