import { type AuthUserData } from "shared-types";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      role: "admin" | "participant";
      userData: AuthUserData;
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "participant";
    nik?: string;
    phone?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    userData: AuthUserData;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    userData?: AuthUserData;
    role?: "admin" | "participant";
    error?: string;
  }
}
