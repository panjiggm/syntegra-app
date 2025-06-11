import { Check, User, GraduationCap, MapPin, CheckCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface RegistrationProgressProps {
  currentStep: number;
  canProceedToStep: (step: number) => boolean;
  onStepClick?: (step: number) => void;
}

const steps = [
  {
    id: 1,
    title: "Data Wajib",
    description: "Informasi dasar",
    icon: User,
  },
  {
    id: 2,
    title: "Background",
    description: "Latar Belakang",
    icon: GraduationCap,
  },
  {
    id: 3,
    title: "Alamat",
    description: "Alamat Lengkap",
    icon: MapPin,
  },
  {
    id: 4,
    title: "Review",
    description: "Konfirmasi data",
    icon: CheckCircle,
  },
];

export function RegistrationProgress({
  currentStep,
  canProceedToStep,
  onStepClick,
}: RegistrationProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const canAccess = canProceedToStep(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center relative",
                  onStepClick && canAccess && "cursor-pointer"
                )}
                onClick={() => onStepClick && canAccess && onStepClick(step.id)}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors",
                    isCompleted
                      ? "bg-green-600 border-green-600 text-white"
                      : isActive
                        ? "bg-blue-600 border-blue-600 text-white"
                        : canAccess
                          ? "border-gray-300 text-gray-500 hover:border-blue-300"
                          : "border-gray-200 text-gray-300"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Step Info */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-center min-w-24">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-green-600"
                          : canAccess
                            ? "text-gray-900"
                            : "text-gray-400"
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors",
                    currentStep > step.id
                      ? "bg-green-600"
                      : currentStep === step.id
                        ? "bg-blue-600"
                        : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-20 mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Progress</span>
          <span>{Math.round((currentStep / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
