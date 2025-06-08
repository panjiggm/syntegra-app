import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { apiClient } from "~/lib/api-client";
import type {
  AuthState,
  AuthUser,
  AuthTokens,
  LoginCredentials,
  ParticipantLoginCredentials,
  LoginResponse,
  ProfileResponse,
} from "~/types/auth";

// Auth Actions
type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: AuthUser; tokens: AuthTokens } }
  | { type: "LOGIN_FAILURE" }
  | { type: "LOGOUT" }
  | { type: "TOKEN_REFRESH"; payload: AuthTokens }
  | { type: "UPDATE_USER"; payload: AuthUser }
  | {
      type: "RESTORE_SESSION";
      payload: { user: AuthUser; tokens: AuthTokens };
    };

// Auth Context Interface
interface AuthContextValue extends AuthState {
  // Authentication methods
  loginAdmin: (credentials: LoginCredentials) => Promise<void>;
  loginParticipant: (credentials: ParticipantLoginCredentials) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;

  // User methods
  refreshProfile: () => Promise<void>;
  updateProfile: (userData: Partial<AuthUser>) => void;

  // Token methods
  refreshTokens: () => Promise<void>;
  isTokenValid: () => boolean;

  // Utility methods
  hasRole: (role: "admin" | "participant") => boolean;
  canAccess: (requiredRole?: "admin" | "participant") => boolean;
}

// Initial State
const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "LOGIN_SUCCESS":
    case "RESTORE_SESSION":
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
      };

    case "LOGIN_FAILURE":
    case "LOGOUT":
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case "TOKEN_REFRESH":
      return {
        ...state,
        tokens: action.payload,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };

    default:
      return state;
  }
}

// Create Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on app load
  const restoreSession = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const tokens = apiClient.getTokens();
      const user = apiClient.getUser();

      if (!tokens || !user) {
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Check if token is expired
      if (apiClient.isTokenExpired(tokens)) {
        // Try to refresh token
        try {
          await refreshTokens();
          const refreshedUser = apiClient.getUser();
          const refreshedTokens = apiClient.getTokens();

          if (refreshedUser && refreshedTokens) {
            dispatch({
              type: "RESTORE_SESSION",
              payload: { user: refreshedUser, tokens: refreshedTokens },
            });
          } else {
            throw new Error("Failed to restore session after refresh");
          }
        } catch (error) {
          console.error("Session restore failed:", error);
          apiClient.clearAuth();
          dispatch({ type: "LOGOUT" });
        }
      } else {
        // Token is still valid, restore session
        dispatch({
          type: "RESTORE_SESSION",
          payload: { user, tokens },
        });

        // Optionally refresh profile to ensure data is up to date
        try {
          await refreshProfile();
        } catch (error) {
          console.warn("Profile refresh failed during session restore:", error);
        }
      }
    } catch (error) {
      console.error("Session restoration error:", error);
      apiClient.clearAuth();
      dispatch({ type: "LOGOUT" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Admin Login
  const loginAdmin = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const response = await apiClient.post<LoginResponse>(
        "/auth/admin/login",
        credentials
      );

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      const { user, tokens } = response.data;

      // Store tokens and user
      apiClient.setTokens(tokens);
      apiClient.setUser(user);

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user, tokens },
      });
    } catch (error) {
      dispatch({ type: "LOGIN_FAILURE" });
      throw error;
    }
  }, []);

  // Participant Login
  const loginParticipant = useCallback(
    async (credentials: ParticipantLoginCredentials) => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const response = await apiClient.post<LoginResponse>(
          "/auth/participant/login",
          credentials
        );

        if (!response.success) {
          throw new Error(response.message || "Login failed");
        }

        const { user, tokens } = response.data;

        // Store tokens and user
        apiClient.setTokens(tokens);
        apiClient.setUser(user);

        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user, tokens },
        });
      } catch (error) {
        dispatch({ type: "LOGIN_FAILURE" });
        throw error;
      }
    },
    []
  );

  // Logout
  const logout = useCallback(
    async (allDevices = false) => {
      try {
        // Call logout API if authenticated
        if (state.isAuthenticated) {
          try {
            await apiClient.post("/auth/logout", { all_devices: allDevices });
          } catch (error) {
            console.warn("Logout API call failed:", error);
            // Continue with local logout even if API fails
          }
        }
      } finally {
        // Always clear local auth state
        apiClient.clearAuth();
        dispatch({ type: "LOGOUT" });
      }
    },
    [state.isAuthenticated]
  );

  // Refresh Profile
  const refreshProfile = useCallback(async () => {
    try {
      const response = await apiClient.get<ProfileResponse>("/auth/me");

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch profile");
      }

      // Update stored user and state
      apiClient.setUser(response.data);
      dispatch({ type: "UPDATE_USER", payload: response.data });
    } catch (error) {
      console.error("Profile refresh failed:", error);
      throw error;
    }
  }, []);

  // Update Profile (local only)
  const updateProfile = useCallback(
    (userData: Partial<AuthUser>) => {
      if (!state.user) return;

      const updatedUser = { ...state.user, ...userData };
      apiClient.setUser(updatedUser);
      dispatch({ type: "UPDATE_USER", payload: updatedUser });
    },
    [state.user]
  );

  // Refresh Tokens
  const refreshTokens = useCallback(async () => {
    const currentTokens = apiClient.getTokens();
    if (!currentTokens?.refresh_token) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiClient.post("/auth/refresh", {
        refresh_token: currentTokens.refresh_token,
      });

      if (!response.success) {
        throw new Error(response.message || "Token refresh failed");
      }

      const newTokens = response.data;
      apiClient.setTokens(newTokens);
      dispatch({ type: "TOKEN_REFRESH", payload: newTokens });

      return newTokens;
    } catch (error) {
      console.error("Token refresh failed:", error);
      apiClient.clearAuth();
      dispatch({ type: "LOGOUT" });
      throw error;
    }
  }, []);

  // Check if token is valid
  const isTokenValid = useCallback(() => {
    const tokens = apiClient.getTokens();
    return tokens ? !apiClient.isTokenExpired(tokens) : false;
  }, []);

  // Check if user has specific role
  const hasRole = useCallback(
    (role: "admin" | "participant") => {
      return state.user?.role === role;
    },
    [state.user?.role]
  );

  // Check if user can access based on role
  const canAccess = useCallback(
    (requiredRole?: "admin" | "participant") => {
      if (!state.isAuthenticated || !state.user) return false;
      if (!requiredRole) return true;
      return state.user.role === requiredRole;
    },
    [state.isAuthenticated, state.user]
  );

  // Handle token expiration events
  useEffect(() => {
    const handleTokenExpired = () => {
      console.warn("Token expired, logging out...");
      logout();
    };

    window.addEventListener("auth:token-expired", handleTokenExpired);
    return () =>
      window.removeEventListener("auth:token-expired", handleTokenExpired);
  }, [logout]);

  // Initialize auth on mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Auto-refresh tokens before expiry (every 10 minutes)
  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) return;

    const interval = setInterval(
      () => {
        const tokens = apiClient.getTokens();
        if (tokens && apiClient.isTokenExpired(tokens)) {
          refreshTokens().catch(console.error);
        }
      },
      10 * 60 * 1000
    ); // 10 minutes

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.tokens, refreshTokens]);

  const value: AuthContextValue = {
    ...state,
    loginAdmin,
    loginParticipant,
    logout,
    refreshProfile,
    updateProfile,
    refreshTokens,
    isTokenValid,
    hasRole,
    canAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
