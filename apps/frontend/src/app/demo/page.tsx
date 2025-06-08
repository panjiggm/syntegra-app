import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const DemoPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-200 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Home
        </Link>
      </div>

      {/* Title Section */}
      <div className="text-center mb-4">
        <h1 className="text-xl md:text-3xl font-black text-gray-800">
          Comming Soon
        </h1>
        <p className="text-sm md:text-lg text-gray-600 font-medium">
          Syntegra Psikotes - Platform Psikotes Digital untuk Kandidat Pekerja
        </p>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          © 2025 Syntegra Services | Dikembangkan oleh{" "}
          <a
            href="https://oknum.studio"
            className="text-emerald-600 font-bold hover:underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Oknum Studio
          </a>
        </p>
      </div>
    </div>
  );
};

export default DemoPage;
