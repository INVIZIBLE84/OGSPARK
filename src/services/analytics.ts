import api from '../lib/api';

export const AnalyticsService = {
  getUserActivity: async () => {
    const response = await api.get<any>('/analytics/user-activity');
    return response.data;
  },

  getPlatformOverview: async () => {
    const response = await api.get<any>('/analytics/platform-overview');
    return response.data;
  },

  getProjectGrowth: async () => {
    const response = await api.get<any>('/analytics/project-growth');
    return response.data;
  },

  getSystemHealth: async () => {
    const response = await api.get<any>('/analytics/system-health');
    return response.data;
  },

  getAdminDashboard: async () => {
    const response = await api.get<any>('/analytics/admin-dashboard');
    return response.data;
  },
};

