export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role_id?: number;
  role_name?: string;
  role_code?: string;
  created_at: string;
}


export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface RefreshResponse {
  access_token: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
