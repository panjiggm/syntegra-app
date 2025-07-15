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
    <div className="w-64 border-r bg-muted/50 p-4">
      <nav className="space-y-2">
        <button
          onClick={() => onTabChange("profile")}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <User className="size-4 mr-3" />
          Informasi Pribadi
        </button>
        {psychotestHistory && (
          <>
            <button
              onClick={() => onTabChange("tests")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "tests"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Target className="size-4 mr-3" />
              Riwayat Tes
            </button>
            <button
              onClick={() => onTabChange("analysis")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "analysis"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="size-4 mr-3" />
              Analisis & Statistik
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
