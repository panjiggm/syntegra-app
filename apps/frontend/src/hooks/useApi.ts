"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ApiRequestOptions extends RequestInit {
  skipAuthRefresh?: boolean; // Skip automatic token refresh for this request
}

export function useApi() {
  const { data: session, update } = useSession();

  const apiCall = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiRequestOptions = {}
    ): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;
      const { skipAuthRefresh = false, ...requestOptions } = options;

      // Get access token from session
      const accessToken = (session as any)?.accessToken;

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(requestOptions.headers as Record<string, string>),
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Make the request
      let response = await fetch(url, {
        ...requestOptions,
        headers,
      });

      // Handle 401 - Unauthorized (token expired or invalid)
      if (response.status === 401 && !skipAuthRefresh && session) {
        console.log("Received 401, attempting session refresh...");

        try {
          // Trigger session update (will call JWT callback)
          await update();

          // Get updated session
          const updatedAccessToken = (session as any)?.accessToken;

          if (updatedAccessToken) {
            headers.Authorization = `Bearer ${updatedAccessToken}`;
            response = await fetch(url, {
              ...requestOptions,
              headers,
            });
          }
        } catch (error) {
          console.log("Session refresh failed:", error);
          throw new Error("Authentication failed - please login again");
        }
      }

      // Handle non-200 responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, create a generic error
          errorData = {
            success: false,
            message: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date().toISOString(),
          };
        }

        // Extract error message from API response
        let errorMessage = "API call failed";

        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }

        const error = new Error(errorMessage);
        // Attach full error data for detailed handling
        (error as any).data = errorData;
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    },
    [session, update]
  );

  // Specialized method for authenticated requests
  const authenticatedCall = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiRequestOptions = {}
    ): Promise<T> => {
      const accessToken = (session as any)?.accessToken;

      if (!accessToken) {
        throw new Error("No access token available - please login");
      }

      return apiCall<T>(endpoint, options);
    },
    [apiCall, session]
  );

  // Specialized method for public requests (no auth required)
  const publicCall = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiRequestOptions = {}
    ): Promise<T> => {
      return apiCall<T>(endpoint, {
        ...options,
        skipAuthRefresh: true,
      });
    },
    [apiCall]
  );

  return {
    apiCall,
    authenticatedCall,
    publicCall,
    getTokens: () => ({
      accessToken: (session as any)?.accessToken || null,
      refreshToken: (session as any)?.refreshToken || null,
    }),
  };
}
