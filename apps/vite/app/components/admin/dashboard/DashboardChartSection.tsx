import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { TrendSessionToggle } from "./TrendSessionToggle";
import { CategoryModuleToggle } from "./CategoryModuleToggle";
import { Badge } from "~/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";
import { useState } from "react";

export function DashboardChartSection() {
  const [trendView, setTrendView] = useState<"trend" | "session">("trend");
  const [trendPeriod, setTrendPeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [distributionView, setDistributionView] = useState<
    "category" | "module"
  >("category");

  // Get descriptions based on active views
  const getTrendDescription = () => {
    if (trendView === "trend") {
      return `Jumlah tes yang diselesaikan peserta secara ${
        trendPeriod === "daily"
          ? "harian, dalam 30 hari terakhir"
          : trendPeriod === "weekly"
            ? "mingguan, dalam 1 bulan"
            : "bulanan"
      }`;
    } else {
      return "Jumlah sesi tes yang diselenggarakan untuk melihat aktivitas tes";
    }
  };

  const getDistributionDescription = () => {
    if (distributionView === "category") {
      return "Distribusi kategori tes yang telah diselesaikan peserta";
    } else {
      return "Distribusi modul tes yang telah diselesaikan peserta";
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 mb-6">
      {/* Left Section - 9 columns */}
      <div className="col-span-12 lg:col-span-9">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Analisis Trend & Aktivitas
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {getTrendDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TrendSessionToggle
              onViewChange={setTrendView}
              onPeriodChange={setTrendPeriod}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Section - 3 columns */}
      <div className="col-span-12 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Distribusi Tes
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {getDistributionDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CategoryModuleToggle onViewChange={setDistributionView} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
