import { useState } from "react";
import { useAuth } from "~/contexts/auth-context";
import type {
  LoginCredentials,
  ParticipantLoginCredentials,
} from "~/types/auth";

interface UseAuthFormOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAuthForm(options: UseAuthFormOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginAdmin, loginParticipant } = useAuth();

  const handleAdminLogin = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      await loginAdmin(credentials);
      options.onSuccess?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Login failed");
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParticipantLogin = async (
    credentials: ParticipantLoginCredentials
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await loginParticipant(credentials);
      options.onSuccess?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Login failed");
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    isLoading,
    error,
    handleAdminLogin,
    handleParticipantLogin,
    clearError,
  };
}

// Hook for logout functionality
export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async (allDevices = false) => {
    try {
      setIsLoading(true);
      await logout(allDevices);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    logout: handleLogout,
  };
}

// Hook for profile management
export function useProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refreshProfile, updateProfile } = useAuth();

  const handleRefreshProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await refreshProfile();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to refresh profile");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error,
    refreshProfile: handleRefreshProfile,
    updateProfile,
    clearError: () => setError(null),
  };
}

// Hook for token management
export function useTokens() {
  const { tokens, isTokenValid, refreshTokens } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshTokens = async () => {
    try {
      setIsRefreshing(true);
      await refreshTokens();
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    tokens,
    isTokenValid,
    isRefreshing,
    refreshTokens: handleRefreshTokens,
  };
}
