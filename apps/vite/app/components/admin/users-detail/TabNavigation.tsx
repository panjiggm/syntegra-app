import { User, Target, TrendingUp } from "lucide-react";

interface PsychotestHistory {
  sessions: any[];
  attempts: any[];
  results_analysis: any[];
  statistics: any;
  performance_by_category: any[];
}

interface TabNavigationProps {
  activeTab: "profile" | "tests" | "analysis";
  onTabChange: (tab: "profile" | "tests" | "analysis") => void;
  psychotestHistory: PsychotestHistory | null;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  psychotestHistory,
}: TabNavigationProps) {
  return (
    <div className="border-b">
      <nav className="flex space-x-8">
        <button
          onClick={() => onTabChange("profile")}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <User className="size-4 inline mr-2" />
          Informasi Pribadi
        </button>
        {psychotestHistory && (
          <>
            <button
              onClick={() => onTabChange("tests")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tests"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Target className="size-4 inline mr-2" />
              Riwayat Tes
            </button>
            <button
              onClick={() => onTabChange("analysis")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "analysis"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <TrendingUp className="size-4 inline mr-2" />
              Analisis & Statistik
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
