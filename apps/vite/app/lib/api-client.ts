import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import type { AuthTokens, RefreshTokenResponse } from "~/types/auth";
import { env } from "./env-config";

// Constants
const API_BASE_URL = env.VITE_API_BASE_URL;
const TOKEN_KEY = "auth_tokens";
const USER_KEY = "auth_user";

// Cookie options
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: true,
  sameSite: "strict" as const,
};

export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const tokens = this.getTokens();
        if (tokens?.access_token && config.headers) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const tokens = this.getTokens();
            if (!tokens?.refresh_token) {
              throw new Error("No refresh token available");
            }

            const newTokens = await this.refreshTokens(tokens.refresh_token);
            this.setTokens(newTokens);

            // Process failed queue
            this.failedQueue.forEach(({ resolve }) => resolve(newTokens));
            this.failedQueue = [];

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect to login
            this.clearAuth();
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];

            // Trigger logout callback if available
            window.dispatchEvent(new CustomEvent("auth:token-expired"));

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Token refresh failed");
      }

      return response.data.data;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  // Token management methods
  getTokens(): AuthTokens | null {
    try {
      const tokensStr = Cookies.get(TOKEN_KEY);
      return tokensStr ? JSON.parse(tokensStr) : null;
    } catch {
      return null;
    }
  }

  setTokens(tokens: AuthTokens): void {
    Cookies.set(TOKEN_KEY, JSON.stringify(tokens), COOKIE_OPTIONS);
  }

  getUser(): any {
    try {
      const userStr = Cookies.get(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  setUser(user: any): void {
    Cookies.set(USER_KEY, JSON.stringify(user), COOKIE_OPTIONS);
  }

  clearAuth(): void {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USER_KEY);
  }

  isTokenExpired(token?: AuthTokens): boolean {
    const tokens = token || this.getTokens();
    if (!tokens?.expires_at) return true;

    const expirationTime = new Date(tokens.expires_at).getTime();
    const currentTime = Date.now();
    const bufferTime = 60 * 1000; // 1 minute buffer

    return currentTime >= expirationTime - bufferTime;
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
