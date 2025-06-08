import NextAuth, { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { AdminLoginRequest, ParticipantLoginRequest } from "shared-types";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Admin Login Provider
    Credentials({
      id: "admin",
      name: "Admin Login",
      credentials: {
        identifier: {
          label: "Email",
          type: "text",
          placeholder: "admin@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.identifier || !credentials?.password) {
            throw new Error("Email dan password harus diisi");
          }

          const loginData: AdminLoginRequest = {
            identifier: credentials.identifier as string,
            password: credentials.password as string,
          };

          const response = await fetch(
            `${NEXT_PUBLIC_API_BASE_URL}/auth/admin/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(loginData),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Login admin gagal");
          }

          const result = await response.json();

          if (!result.success || !result.data) {
            throw new Error(result.message || "Login admin gagal");
          }

          // Return user object for session
          return {
            id: result.data.user.id,
            name: result.data.user.name,
            email: result.data.user.email,
            role: result.data.user.role,
            nik: result.data.user.nik,
            phone: result.data.user.phone,
            accessToken: result.data.tokens.access_token,
            refreshToken: result.data.tokens.refresh_token,
            expiresAt: result.data.tokens.expires_at,
            userData: result.data.user, // Store full user data
          };
        } catch (error: any) {
          console.error("Admin login error:", error);
          throw new Error(error.message || "Login admin gagal");
        }
      },
    }),

    // Participant Login Provider
    Credentials({
      id: "participant",
      name: "Participant Login",
      credentials: {
        phone: {
          label: "Nomor Telepon",
          type: "tel",
          placeholder: "08123456789",
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.phone) {
            throw new Error("Nomor telepon harus diisi");
          }

          const loginData: ParticipantLoginRequest = {
            phone: credentials.phone as string,
          };

          const response = await fetch(
            `${NEXT_PUBLIC_API_BASE_URL}/auth/participant/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(loginData),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Login participant gagal");
          }

          const result = await response.json();

          if (!result.success || !result.data) {
            throw new Error(result.message || "Login participant gagal");
          }

          // Return user object for session
          return {
            id: result.data.user.id,
            name: result.data.user.name,
            email: result.data.user.email,
            role: result.data.user.role,
            nik: result.data.user.nik,
            phone: result.data.user.phone,
            accessToken: result.data.tokens.access_token,
            refreshToken: result.data.tokens.refresh_token,
            expiresAt: result.data.tokens.expires_at,
            userData: result.data.user, // Store full user data
          };
        } catch (error: any) {
          console.error("Participant login error:", error);
          throw new Error(error.message || "Login participant gagal");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          expiresAt: user.expiresAt,
          userData: user.userData,
          role: user.role,
        };
      }

      // Check if token is expired and refresh if needed
      if (token.expiresAt && new Date() > new Date(token.expiresAt as string)) {
        return await refreshAccessToken(token);
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: any }) {
      // Send properties to the client
      return {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        user: {
          ...session.user,
          role: token.role,
          userData: token.userData,
        },
      };
    },

    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Public routes that don't require authentication
      const publicRoutes = [
        "/",
        "/auth/signin",
        "/auth/error",
        "/admin/login",
        "/participant/login",
        "/admin/register",
        "/participant/register",
        "/about",
        "/contact",
      ];

      // Admin-only routes
      const adminRoutes = [
        "/admin/dashboard",
        "/admin/participants",
        "/admin/tests",
        "/admin/sessions",
        "/admin/reports",
      ];

      // Participant-only routes
      const participantRoutes = ["/participant/dashboard", "/participant/test"];

      // Allow access to public routes
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return true;
      }

      // Redirect to appropriate login if not logged in
      if (!isLoggedIn) {
        if (adminRoutes.some((route) => pathname.startsWith(route))) {
          return Response.redirect(new URL("/admin/login", nextUrl));
        }
        if (participantRoutes.some((route) => pathname.startsWith(route))) {
          return Response.redirect(new URL("/participant/login", nextUrl));
        }
        return false;
      }

      // Check role-based access
      const userRole = auth?.user?.role;

      if (adminRoutes.some((route) => pathname.startsWith(route))) {
        return userRole === "admin";
      }

      if (participantRoutes.some((route) => pathname.startsWith(route))) {
        return userRole === "participant";
      }

      return true;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours (same as backend)
  },

  secret: process.env.AUTH_SECRET,
});

// Refresh token function
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: token.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const refreshedTokens = await response.json();

    if (!refreshedTokens.success) {
      throw new Error("Failed to refresh token");
    }

    return {
      ...token,
      accessToken: refreshedTokens.data.access_token,
      refreshToken: refreshedTokens.data.refresh_token,
      expiresAt: refreshedTokens.data.expires_at,
    };
  } catch (error) {
    console.error("Error refreshing access token", error);

    // Return token with error flag to force re-login
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
