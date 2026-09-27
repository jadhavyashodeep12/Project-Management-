import api from './api';
import type { User } from '../types/auth';

export interface Team {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  lead_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeamCreateParams {
  name: string;
  description?: string;
  project_id: number;
  lead_id?: number;
}

export interface TeamUpdateParams {
  name?: string;
  description?: string;
  lead_id?: number;
}

export const teamsService = {
  listForProject: async (projectId: number): Promise<Team[]> => {
    const response = await api.get<Team[]>(`/teams/project/${projectId}`);
    return response.data;
  },

  get: async (teamId: number): Promise<Team> => {
    const response = await api.get<Team>(`/teams/${teamId}`);
    return response.data;
  },

  create: async (params: TeamCreateParams): Promise<Team> => {
    const response = await api.post<Team>('/teams', params);
    return response.data;
  },

  update: async (teamId: number, params: TeamUpdateParams): Promise<Team> => {
    const response = await api.patch<Team>(`/teams/${teamId}`, params);
    return response.data;
  },

  listMembers: async (teamId: number): Promise<User[]> => {
    const response = await api.get<User[]>(`/teams/${teamId}/members`);
    return response.data;
  },

  addMember: async (teamId: number, userId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/teams/${teamId}/members`, {
      user_id: userId,
    });
    return response.data;
  },

  removeMember: async (teamId: number, userId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  deleteTeam: async (teamId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}`);
  },
};

