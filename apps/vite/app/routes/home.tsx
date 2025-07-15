import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";

// UI Components
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

// Icons
import {
  ArrowRight,
  CheckCircle,
  UserPlus,
  LogIn,
  ShieldCheck,
  ArrowUpRight,
  WholeWord,
  Globe2,
  Globe,
} from "lucide-react";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useAuth } from "~/contexts/auth-context";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Syntegra Psikotes - Platform Tes Psikologi Online Terpercaya" },
    {
      name: "description",
      content:
        "Platform psikotes online profesional untuk rekrutmen dan seleksi karyawan. Tes psikologi akurat dengan analisis mendalam.",
    },
    {
      name: "keywords",
      content:
        "psikotes, tes psikologi, rekrutmen, seleksi karyawan, assessment online",
    },
  ];
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If still loading auth state, wait
    if (isLoading) return;

    // If authenticated, redirect based on role
    if (isAuthenticated && user) {
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "participant") {
        navigate("/participant/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/images/syntegra-logo.jpg"
                alt="Syntegra"
                className="h-6 w-6"
              />
              <span className="text-xl font-bold text-gray-900">Syntegra</span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link
                  to="https://syntegra-services.com/"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Website Syntegra
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 bg-gray-50">
        <div className="container mx-auto max-w-xl px-4 py-16">
          <div className="text-center">
            <div className="mb-8">
              <img
                src="/images/syntegra-logo.jpg"
                alt="Syntegra"
                className="h-16 w-16 mx-auto mb-4"
              />
              <h1 className="text-5xl font-black text-gray-900 mb-4">
                Sistem Pengelolaan Kandidat Pekerja
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Platform Tes Psikologi, Administrasi dan Tes Fisik online untuk
                kebutuhan internal perusahaan
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-md mx-auto">
              <Button size="lg" asChild className="w-full">
                <Link
                  to="/participant/login"
                  className="flex items-center justify-center gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Login Peserta
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full">
                <Link
                  to="/admin/login"
                  className="flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Login Admin
                </Link>
              </Button>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-4">
                Belum memiliki akun peserta?
              </p>
              <Button variant="link" asChild>
                <Link to="/registration" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Daftar Sebagai Peserta
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-500">
              © 2025 Syntegra Services. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Dikembangkan oleh{" "}
              <a
                href="https://oknum.studio"
                className="text-emerald-600 font-bold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Oknum.Studio
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
