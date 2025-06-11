import { useEffect } from "react";
import { useNavigate } from "react-router";
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
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Pendaftaran Akun
                </h1>
                <p className="text-gray-600">
                  Daftar untuk mengakses layanan psikotes online Syntegra
                </p>
              </div>
            </div>
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
