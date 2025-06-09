export interface AuthUser {
  id: string;
  nik?: string;
  name: string;
  email: string;
  role: "admin" | "participant";
  gender?: "male" | "female" | "other";
  phone?: string;
  birth_place?: string;
  birth_date?: string;
  religion?: string;
  education?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  postal_code?: string;
  profile_picture_url?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  identifier: string; // NIK or email for admin
  password: string;
}

export interface ParticipantLoginCredentials {
  phone: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
  timestamp: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: AuthTokens;
  timestamp: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: AuthUser;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}
