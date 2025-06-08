"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  BarChart3,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "Peikotes Komprehensif",
      description:
        "Berbagai jenis tes psikologi yang telah terstandarisasi untuk evaluasi kandidat yang akurat dan mendalam.",
    },
    {
      icon: BarChart3,
      title: "Analitik Visual Interaktif",
      description:
        "Dashboard dengan grafik dan visualisasi data yang mudah dipahami untuk pengambilan keputusan yang tepat.",
    },
    {
      icon: Users,
      title: "Manajemen Kandidat",
      description:
        "Kelola data kandidat, buat akun tes, dan pantau progres dengan sistem yang terintegrasi dan efisien.",
    },
    {
      icon: Shield,
      title: "Keamanan Data Terjamin",
      description:
        "Sistem keamanan berlapis dengan enkripsi data dan monitoring lokasi untuk menjaga integritas hasil tes.",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div
          className="absolute top-40 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-green-500/5 rounded-full blur-3xl"
          style={{ transform: `translateY(${scrollY * -0.1}px)` }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center">
                <Image
                  src={"/images/syntegra-logo.jpg"}
                  width={30}
                  height={30}
                  alt="Logo"
                  className="size-5 md:size-7"
                />
              </div>
              <span className="text-lg md:text-2xl font-black text-gray-800">
                Syntegra
              </span>
            </div>
            <Button variant="outline" asChild>
              <Link href="/participant/login">Login Peserta</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`text-center transition-all duration-1000 transform ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            }`}
          >
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-xs font-medium text-primary mb-6">
              <CheckCircle className="size-4 mr-2" />
              Platform Psikotes Digital Terdepan
            </div>

            <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent mb-6 leading-tight">
              Sistem Psikotes
              <br />
              <span className="text-primary">Cerdas & Akurat</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Revolusi proses rekrutmen dengan platform psikotes digital yang
              dilengkapi analitik mendalam, monitoring real-time, dan laporan
              komprehensif untuk pengambilan keputusan HR yang lebih tepat.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={"/demo"}>
                <Button className="group supabase-gradient hover:scale-105 transition-all duration-200">
                  Mulai Demo Sekarang
                  <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href={"/admin/login"}>
                <Button
                  variant="outline"
                  className="hover:bg-primary/5 transition-all duration-200"
                >
                  Lanjut Sebagai Admin
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Image/Visual */}
          <div
            className={`mt-16 transition-all duration-1200 delay-300 transform ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl p-8 backdrop-blur-sm border supabase-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-background/80 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-primary">95%</div>
                    <div className="text-sm text-muted-foreground">
                      Akurasi Tes
                    </div>
                  </div>
                  <div className="bg-background/80 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-primary">15+</div>
                    <div className="text-sm text-muted-foreground">
                      Jenis Tes
                    </div>
                  </div>
                  <div className="bg-background/80 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-primary">1000+</div>
                    <div className="text-sm text-muted-foreground">
                      Kandidat
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`transition-all duration-700 transform hover:scale-105 ${
                    isVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-8 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <Card className="h-full group hover:shadow-2xl transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
                        <Icon className="size-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center justify-center text-primary-foreground">
                <Image
                  src={"/images/syntegra-logo.jpg"}
                  width={30}
                  height={30}
                  alt="Logo"
                  className="size-5 md:size-7"
                />
              </div>
              <span className="text-xl md:text-2xl font-black text-gray-800">
                Syntegra Services
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Syntegra Services. Dikembangkan oleh{" "}
              <a
                href="https://oknum.studio"
                className="text-emerald-700 font-bold hover:underline"
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
