import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/registration";

// UI Components
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

// Icons
import { ArrowLeft, UserPlus, Shield, Clock } from "lucide-react";

// Store and Components
import { useRegistrationStore } from "~/stores/registration";
import { RegistrationProgress } from "~/components/registration/RegistrationProgress";
import { Step1DataWajib } from "~/components/registration/Step1DataWajib";
import { Step2DataTambahan } from "~/components/registration/Step2DataTambahan";
import { Step3AlamatWilayah } from "~/components/registration/Step3AlamatWilayah";
import { Step4Overview } from "~/components/registration/Step4Overview";

// Auth
import { useAuth } from "~/contexts/auth-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pendaftaran Akun - Syntegra Psikotes" },
    {
      name: "description",
      content:
        "Daftar akun baru untuk mengakses layanan psikotes online Syntegra",
    },
  ];
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { currentStep, canProceedToStep, setCurrentStep, nextStep, prevStep } =
    useRegistrationStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/participant/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleStepClick = (step: number) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrev = () => {
    prevStep();
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1DataWajib onNext={handleNext} />;
      case 2:
        return <Step2DataTambahan onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <Step3AlamatWilayah onNext={handleNext} onPrev={handlePrev} />;
      case 4:
        return <Step4Overview onPrev={handlePrev} onEdit={handleEdit} />;
      default:
        return <Step1DataWajib onNext={handleNext} />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-2 py-10 mb-4">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 font-medium hover:opacity-80 transition-opacity"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-md">
                <img
                  src="/images/syntegra-clear-logo.png"
                  alt="Syntegra Logo"
                  className="object-contain"
                />
              </div>
              <span className="sr-only">Syntegra Services</span>
            </Link>
            <h1 className="text-xl font-bold">
              Selamat Datang di Syntegra Services
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Daftar untuk mengikuti psikotes
            </p>
          </div>

          {/* Progress Stepper */}
          <RegistrationProgress
            currentStep={currentStep}
            canProceedToStep={canProceedToStep}
            onStepClick={handleStepClick}
          />

          {/* Current Step Content */}
          <div className="max-w-2xl mx-auto">{renderCurrentStep()}</div>

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-gray-500">
            <p>
              Sudah punya akun?{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-blue-600 hover:text-blue-700"
                onClick={() => navigate("/participant/login")}
              >
                Login di sini
              </Button>
            </p>
            <p className="mt-2">
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
      </div>
    </div>
  );
}
