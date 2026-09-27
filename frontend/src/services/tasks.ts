import api from './api';
import type { User } from '../types/auth';

export interface Task {
  id: number;
  project_id: number;
  key: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'bug' | 'story' | 'epic';
  story_points: number | null;
  due_date: string | null;
  column_id: number | null;
  creator_id: number;
  assignee_id: number | null;
  creator?: User;
  assignee?: User;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateParams {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'task' | 'bug' | 'story' | 'epic';
  column_id?: number;
  assignee_id?: number;
  due_date?: string;
  story_points?: number;
}

export interface TaskUpdateParams {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: 'task' | 'bug' | 'story' | 'epic';
  column_id?: number;
  assignee_id?: number;
  due_date?: string;
  story_points?: number;
  order_index?: number;
}

export const tasksService = {
  listForProject: async (projectId: number): Promise<Task[]> => {
    const response = await api.get<Task[]>(`/projects/${projectId}/tasks`);
    return response.data;
  },

  create: async (projectId: number, params: TaskCreateParams): Promise<Task> => {
    const response = await api.post<Task>(`/projects/${projectId}/tasks`, params);
    return response.data;
  },

  get: async (taskId: number): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${taskId}`);
    return response.data;
  },

  update: async (taskId: number, params: TaskUpdateParams): Promise<Task> => {
    const response = await api.patch<Task>(`/tasks/${taskId}`, params);
    return response.data;
  },

  delete: async (taskId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },
};
