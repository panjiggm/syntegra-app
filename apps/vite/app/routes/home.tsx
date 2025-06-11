import { Link } from "react-router";
import type { Route } from "./+types/home";

// UI Components
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

// Icons
import {
  ArrowRight,
  BookOpen,
  Users,
  Clock,
  Shield,
  CheckCircle,
  Star,
  BarChart3,
  FileText,
  UserPlus,
  LogIn,
  Zap,
  Target,
  Award,
  Brain,
  ShieldCheck,
} from "lucide-react";

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/images/syntegra-logo.jpg"
                alt="Syntegra"
                className="h-6 w-6"
              />
              <span className="text-xl font-black bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Syntegra
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/about"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Tentang Kami
              </Link>

              <Link
                to="/contact"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Kontak
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link
                  to="/participant/login"
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Masuk
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin/login" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl">
        <div>
          <div className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge
                  variant="outline"
                  className="mb-6 border-amber-200 text-yellow-700"
                >
                  Platform Psikotes Terpercaya #1 di Indonesia
                </Badge>

                <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
                  Solusi Psikotes{" "}
                  <span className="bg-gradient-to-r from-amber-700 to-yellow-500 bg-clip-text text-transparent">
                    Modern
                  </span>{" "}
                  untuk Rekrutmen
                </h1>

                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Platform tes psikologi online yang akurat, efisien, dan mudah
                  digunakan. Temukan kandidat terbaik dengan analisis psikologis
                  mendalam.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild className="text-lg px-8 py-6">
                    <Link
                      to="/registration"
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-5 w-5" />
                      Mulai Gratis Sekarang
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="text-lg px-8 py-6"
                  >
                    <Link to="/demo" className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Lihat Demo
                    </Link>
                  </Button>
                </div>

                <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Gratis untuk peserta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Setup dalam 5 menit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Data aman & terlindungi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className=" py-20 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Mengapa Memilih Syntegra?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Solusi lengkap untuk kebutuhan assessment psikologis perusahaan
                Anda
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Setup Cepat & Mudah</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Buat sesi psikotes dalam hitungan menit. Interface yang
                    intuitif memudahkan admin dalam mengelola tes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Tes Psikologi Akurat</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Berbagai jenis tes psikologi standar seperti MBTI, WAIS, Big
                    Five, dan masih banyak lagi dengan analisis yang mendalam.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Laporan Analitik</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Dapatkan laporan lengkap dengan visualisasi data,
                    rekomendasi, dan insight untuk keputusan rekrutmen yang
                    tepat.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle>Waktu Fleksibel</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Atur jadwal tes sesuai kebutuhan. Peserta dapat mengakses
                    tes sesuai waktu yang telah ditentukan.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle>Keamanan Terjamin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Data peserta dan hasil tes diamankan dengan enkripsi tingkat
                    enterprise. Privasi dan kerahasiaan terjaga.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                    <Award className="h-6 w-6 text-indigo-600" />
                  </div>
                  <CardTitle>Hasil Profesional</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Laporan hasil yang komprehensif dan mudah dipahami untuk
                    mendukung keputusan HR yang lebih objektif.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 text-white py-4">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-xs text-gray-400">
              © 2025 Syntegra Services. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Dikembangkan oleh{" "}
              <a
                href="https://oknum.studio"
                className="text-emerald-400 font-bold hover:underline"
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
