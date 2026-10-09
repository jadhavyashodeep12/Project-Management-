import api from './api';
import type { User } from '../types/auth';

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
  owner_id: number;
  manager_id?: number | null;
  status: 'active' | 'archived';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateParams {
  key: string;
  name: string;
  description?: string;
  manager_id?: number | null;
  start_date?: string;
  end_date?: string;
}

export interface ProjectUpdateParams {
  name?: string;
  description?: string;
  manager_id?: number | null;
  status?: 'active' | 'archived';
  start_date?: string;
  end_date?: string;
}

export const projectsService = {
  list: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  get: async (projectId: number): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  create: async (params: ProjectCreateParams): Promise<Project> => {
    const response = await api.post<Project>('/projects', params);
    return response.data;
  },

  update: async (projectId: number, params: ProjectUpdateParams): Promise<Project> => {
    const response = await api.patch<Project>(`/projects/${projectId}`, params);
    return response.data;
  },

  assignManager: async (projectId: number, managerId: number | null): Promise<Project> => {
    const response = await api.put<Project>(`/projects/${projectId}/manager`, { manager_id: managerId });
    return response.data;
  },

  delete: async (projectId: number): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },

  listMembers: async (projectId: number): Promise<User[]> => {
    const response = await api.get<User[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  addMember: async (projectId: number, userId: number, roleId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/projects/${projectId}/members`, {
      user_id: userId,
      role_id: roleId,
    });
    return response.data;
  },

  removeMember: async (projectId: number, userId: number): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },
};

