import React from "react";
import { Badge } from "../ui/badge";
import { Clock10, NotebookPen } from "lucide-react";

// Module type labels mapping
const MODULE_TYPE_LABELS = {
  intelligence: "Inteligensi",
  personality: "Kepribadian",
  aptitude: "Bakat",
  interest: "Minat",
  projective: "Proyektif",
  cognitive: "Kognitif",
} as const;

// Category labels mapping
const CATEGORY_LABELS = {
  wais: "WAIS",
  mbti: "MBTI",
  wartegg: "Wartegg",
  riasec: "RIASEC",
  kraepelin: "Kraepelin",
  pauli: "Pauli",
  big_five: "Big Five",
  papi_kostick: "PAPI Kostick",
  dap: "DAP",
  raven: "Raven",
  epps: "EPPS",
  army_alpha: "Army Alpha",
  htp: "HTP",
  disc: "DISC",
  iq: "IQ Test",
  eq: "EQ Test",
} as const;

interface TestData {
  id: string | undefined;
  name: string | undefined;
  description?: string | undefined;
  module_type: keyof typeof MODULE_TYPE_LABELS | undefined;
  category: keyof typeof CATEGORY_LABELS | undefined;
  time_limit: number | undefined;
  icon?: string | undefined;
  card_color?: string | undefined;
  test_prerequisites?: string[] | undefined;
  display_order?: number | undefined;
  subcategory?: string[] | undefined;
  total_questions?: number | undefined;
  passing_score?: number | undefined;
  status?: "active" | "inactive" | "archived" | undefined;
  instructions?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  created_by?: string | undefined;
  updated_by?: string | undefined;
}

const CARD_COLOR_VARIANTS = {
  "from-red-500 to-red-600":
    "bg-gradient-to-br from-red-500 to-red-600 text-red-100",
  "from-orange-500 to-orange-600":
    "bg-gradient-to-br from-orange-500 to-orange-600 text-orange-100",
  "from-amber-500 to-amber-600":
    "bg-gradient-to-br from-amber-500 to-amber-600 text-amber-100",
  "from-yellow-500 to-yellow-600":
    "bg-gradient-to-br from-yellow-500 to-yellow-600 text-yellow-100",
  "from-lime-500 to-lime-600":
    "bg-gradient-to-br from-lime-500 to-lime-600 text-lime-100",
  "from-green-500 to-green-600":
    "bg-gradient-to-br from-green-500 to-green-600 text-green-100",
  "from-emerald-500 to-emerald-600":
    "bg-gradient-to-br from-emerald-500 to-emerald-600 text-emerald-100",
  "from-teal-500 to-teal-600":
    "bg-gradient-to-br from-teal-500 to-teal-600 text-teal-100",
  "from-cyan-500 to-cyan-600":
    "bg-gradient-to-br from-cyan-500 to-cyan-600 text-cyan-100",
  "from-sky-500 to-sky-600":
    "bg-gradient-to-br from-sky-500 to-sky-600 text-sky-100",
  "from-blue-500 to-blue-600":
    "bg-gradient-to-br from-blue-500 to-blue-600 text-blue-100",
  "from-indigo-500 to-indigo-600":
    "bg-gradient-to-br from-indigo-500 to-indigo-600 text-indigo-100",
  "from-violet-500 to-violet-600":
    "bg-gradient-to-br from-violet-500 to-violet-600 text-violet-100",
  "from-purple-500 to-purple-600":
    "bg-gradient-to-br from-purple-500 to-purple-600 text-purple-100",
  "from-fuchsia-500 to-fuchsia-600":
    "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-fuchsia-100",
  "from-pink-500 to-pink-600":
    "bg-gradient-to-br from-pink-500 to-pink-600 text-pink-100",
  "from-rose-500 to-rose-600":
    "bg-gradient-to-br from-rose-500 to-rose-600 text-rose-100",
  "from-slate-500 to-slate-600":
    "bg-gradient-to-br from-slate-500 to-slate-600 text-slate-100",
  "from-zinc-500 to-zinc-600":
    "bg-gradient-to-br from-zinc-500 to-zinc-600 text-zinc-100",
  "from-neutral-500 to-neutral-600":
    "bg-gradient-to-br from-neutral-500 to-neutral-600 text-neutral-100",
  "from-stone-500 to-stone-600":
    "bg-gradient-to-br from-stone-500 to-stone-600 text-stone-100",
} as const;

const getGradientClass = (cardColor?: string): string => {
  if (!cardColor) {
    return "bg-gradient-to-br from-gray-500 to-gray-600"; // default
  }

  return (
    CARD_COLOR_VARIANTS[cardColor as keyof typeof CARD_COLOR_VARIANTS] ||
    "bg-gradient-to-br from-gray-500 to-gray-600"
  );
};

export const StatusBadge = ({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) => {
  const variants = {
    active: "bg-green-100 text-green-700 hover:bg-green-200",
    inactive: "bg-red-100 text-red-700 hover:bg-red-200",
    archived: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  const labels = {
    active: "Aktif",
    inactive: "Tidak Aktif",
    archived: "Diarsipkan",
  };

  return (
    <Badge className={variants[status]} variant="secondary">
      {labels[status]}
    </Badge>
  );
};

const CardTestModule = ({ test }: { test: TestData }) => {
  const gradientClass = getGradientClass(test.card_color);

  return (
    <div className="w-full max-w-2xs">
      <div
        className={`rounded-xl p-4 shadow-lg transition-all duration-200 cursor-pointer hover:shadow-xl transform hover:scale-105 ${gradientClass}`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-3xl">{test.icon}</span>
          <StatusBadge status={test.status || "active"} />
        </div>

        <h3 className={`font-bold text-md mb-1 line-clamp-1`}>{test.name}</h3>
        <p className={`text-xs mb-3 line-clamp-2`}>{test.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock10 className="h-4 w-4" />
            <span className={`text-xs`}>{`${test.time_limit} menit`}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotebookPen className="h-4 w-4" />
            <span className={`text-xs`}>{`${test.total_questions} soal`}</span>
          </div>
        </div>

        <div className={`mt-2 pt-2 border-t border-gray-300`}>
          <p className={`text-xs `}>• {test.module_type}</p>
          <p className={`text-xs `}>• {test.category}</p>
        </div>
      </div>
    </div>
  );
};

export default CardTestModule;
