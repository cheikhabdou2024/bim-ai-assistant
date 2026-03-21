export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
