"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import type { AuthUserData } from "shared-types";

export function useNextAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Admin Login
  const useAdminLogin = () => {
    return useMutation({
      mutationFn: async (data: {
        identifier: string;
        password: string;
        rememberMe?: boolean;
      }) => {
        const result = await signIn("admin", {
          identifier: data.identifier,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        return { success: true, rememberMe: data.rememberMe };
      },
      onSuccess: (data) => {
        toast.success("Login berhasil!", {
          description: `Selamat datang ${session?.user?.name}`,
          action: {
            label: "Dashboard",
            onClick: () => router.push("/admin/dashboard"),
          },
        });

        // Show session info
        const sessionDuration = data.rememberMe ? "hingga expired" : "saat ini";
        setTimeout(() => {
          toast.info("Admin Session Active", {
            description: `Session tersimpan untuk ${sessionDuration}. Auto-refresh aktif setiap 2 jam.`,
            duration: 6000,
          });
        }, 2000);

        // Redirect to admin dashboard
        router.push("/admin/dashboard");
      },
      onError: (error: any) => {
        console.error("Admin login error:", error);

        let errorMessage = "Terjadi kesalahan saat login";
        let actionButton = undefined;

        if (error.message) {
          const errorMsg = error.message.toLowerCase();

          if (
            errorMsg.includes("invalid credentials") ||
            errorMsg.includes("user not found") ||
            errorMsg.includes("password incorrect") ||
            errorMsg.includes("email not found")
          ) {
            errorMessage = "Email atau password tidak valid";
          } else if (
            errorMsg.includes("account") &&
            errorMsg.includes("locked")
          ) {
            errorMessage =
              "Akun Anda sementara dikunci karena terlalu banyak percobaan login. Hubungi administrator untuk bantuan.";
            actionButton = {
              label: "Reset Password",
              onClick: () =>
                toast.info("Reset Password", {
                  description:
                    "Hubungi super admin untuk reset password akun Anda",
                  duration: 8000,
                }),
            };
          } else if (
            errorMsg.includes("inactive") ||
            errorMsg.includes("deactivated")
          ) {
            errorMessage =
              "Akun Anda tidak aktif. Hubungi administrator untuk aktivasi akun.";
          } else if (
            errorMsg.includes("admin") &&
            errorMsg.includes("required")
          ) {
            errorMessage =
              "Akun ini bukan akun administrator. Gunakan halaman login participant untuk akses.";
            actionButton = {
              label: "Login Participant",
              onClick: () => router.push("/participant/login"),
            };
          } else {
            errorMessage = error.message;
          }
        }

        toast.error("Login gagal", {
          description: errorMessage,
          duration: 8000,
          action: actionButton,
        });
      },
    });
  };

  // Participant Login
  const useParticipantLogin = () => {
    return useMutation({
      mutationFn: async (data: { phone: string; rememberMe?: boolean }) => {
        const result = await signIn("participant", {
          phone: data.phone,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        return { success: true, rememberMe: data.rememberMe };
      },
      onSuccess: (data) => {
        toast.success("Login berhasil!", {
          description: `Selamat datang ${session?.user?.name}`,
          action: {
            label: "Dashboard",
            onClick: () => router.push("/participant/dashboard"),
          },
        });

        // Show session info
        const sessionDuration = data.rememberMe ? "hingga expired" : "saat ini";
        setTimeout(() => {
          toast.info("Session Info", {
            description: `Session tersimpan untuk ${sessionDuration}`,
            duration: 5000,
          });
        }, 2000);

        // Redirect to participant dashboard
        router.push("/participant/dashboard");
      },
      onError: (error: any) => {
        console.error("Participant login error:", error);

        let errorMessage = "Terjadi kesalahan saat login";
        let actionButton = undefined;

        if (error.message) {
          const errorMsg = error.message.toLowerCase();

          if (
            errorMsg.includes("user not found") ||
            errorMsg.includes("invalid credentials")
          ) {
            errorMessage = "Nomor telepon tidak ditemukan dalam sistem";
            actionButton = {
              label: "Daftar Akun",
              onClick: () => router.push("/participant/register"),
            };
          } else if (
            errorMsg.includes("account") &&
            errorMsg.includes("locked")
          ) {
            errorMessage =
              "Akun Anda sementara dikunci. Hubungi admin untuk bantuan.";
            actionButton = {
              label: "Bantuan",
              onClick: () =>
                toast.info("Hubungi Admin", {
                  description:
                    "Silakan hubungi administrator untuk membuka kunci akun Anda",
                  duration: 8000,
                }),
            };
          } else if (
            errorMsg.includes("inactive") ||
            errorMsg.includes("deactivated")
          ) {
            errorMessage =
              "Akun Anda tidak aktif. Hubungi admin untuk aktivasi.";
          } else {
            errorMessage = error.message;
          }
        }

        toast.error("Login gagal", {
          description: errorMessage,
          duration: 8000,
          action: actionButton,
        });
      },
    });
  };

  // Enhanced logout
  const logout = async () => {
    try {
      // Show logout progress
      const loadingToast = toast.loading("Logging out...", {
        description: "Cleaning up session",
      });

      await signOut({ redirect: false });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      toast.success("Logout berhasil", {
        description: "Anda telah keluar dari sistem",
        action: {
          label: "Login Lagi",
          onClick: () => router.push("/"),
        },
      });

      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);

      toast.error("Logout gagal", {
        description: "Terjadi kesalahan saat logout",
        duration: 6000,
      });
    }
  };

  // Get user data
  const user: AuthUserData | null = session?.user?.userData || null;
  const isAuthenticated = !!session?.user;
  const isLoading = status === "loading";

  // Get access token for API calls
  const getAccessToken = () => session?.accessToken;

  return {
    user,
    isAuthenticated,
    isLoading,
    session,
    useAdminLogin,
    useParticipantLogin,
    logout,
    getAccessToken,
  };
}
