import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { AlertCircle, RefreshCw, PieChart, Donut } from "lucide-react";
import { useTestCategoryPie } from "~/hooks/use-dashboard-test-category-pie";
import { useTestModuleDonut } from "~/hooks/use-dashboard-test-module-donut";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

type ViewType = "category" | "module";

export function CategoryModuleToggle() {
  const [activeView, setActiveView] = useState<ViewType>("category");

  // Fetch data based on active view
  const categoryQuery = useTestCategoryPie({
    enabled: activeView === "category",
  });

  const moduleQuery = useTestModuleDonut({ enabled: activeView === "module" });

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
  };

  const handleRefresh = () => {
    if (activeView === "category") {
      categoryQuery.refetch();
    } else {
      moduleQuery.refetch();
    }
  };

  // Get current view state
  const currentIsLoading =
    activeView === "category" ? categoryQuery.isLoading : moduleQuery.isLoading;
  const currentError =
    activeView === "category" ? categoryQuery.error : moduleQuery.error;
  const currentData =
    activeView === "category" ? categoryQuery.data : moduleQuery.data;

  return (
    <div className="space-y-4">
      {/* Toggle Controls */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant={activeView === "category" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("category")}
              className="flex items-center gap-1 sm:gap-2 flex-1"
            >
              <PieChart className="w-4 h-4" />
              <span className="hidden sm:inline">Category</span>
              <span className="sm:hidden">Cat</span>
            </Button>
            <Button
              variant={activeView === "module" ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewChange("module")}
              className="flex items-center gap-1 sm:gap-2 flex-1"
            >
              <Donut className="w-4 h-4" />
              <span className="hidden sm:inline">Module</span>
              <span className="sm:hidden">Mod</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={currentIsLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-4 h-4 ${currentIsLoading ? "animate-spin" : ""}`}
            />
            <span className="ml-2 sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="h-72">
        {currentIsLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : currentError ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-xs text-red-600 font-medium text-center">
              Gagal memuat data{" "}
              {activeView === "category" ? "kategori" : "modul"}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {(currentError as Error)?.message || "Terjadi kesalahan"}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Coba Lagi
            </Button>
          </div>
        ) : activeView === "category" && categoryQuery.data ? (
          <ChartDisplay data={categoryQuery.data} activeView={activeView} />
        ) : activeView === "module" && moduleQuery.data ? (
          <ChartDisplay data={moduleQuery.data} activeView={activeView} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center">
              Tidak ada data untuk ditampilkan
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {!currentIsLoading && !currentError && (
        <div className="space-y-3 pt-4 border-t">
          {activeView === "category" && categoryQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Tes
                  </p>
                  <p className="text-sm font-bold">
                    {categoryQuery.data.total_tests}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Kategori
                  </p>
                  <p className="text-sm font-bold">
                    {categoryQuery.data.categories_count}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Terpopuler:
                  </span>
                  <span className="text-xs font-medium">
                    {categoryQuery.data.formattedSummary?.most_popular_category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Keragaman:
                  </span>
                  <span
                    className={`text-xs font-medium ${categoryQuery.data.formattedSummary?.diversity_color}`}
                  >
                    {categoryQuery.data.formattedSummary?.diversity_level}
                  </span>
                </div>
              </div>
            </>
          )}

          {activeView === "module" && moduleQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total Tes
                  </p>
                  <p className="text-sm font-bold">
                    {moduleQuery.data.total_tests}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Modul
                  </p>
                  <p className="text-sm font-bold">
                    {moduleQuery.data.module_types_count}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Terpopuler:
                  </span>
                  <span className="text-xs font-medium">
                    {moduleQuery.data.formattedSummary?.most_popular_module}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Keragaman:
                  </span>
                  <span
                    className={`text-xs font-medium ${moduleQuery.data.formattedSummary?.diversity_color}`}
                  >
                    {moduleQuery.data.formattedSummary?.diversity_level}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ChartDisplay({
  data,
  activeView,
}: {
  data: any;
  activeView: ViewType;
}) {
  const chartData = data.chartData || [];
  const innerRadius = activeView === "module" ? 35 : 25;
  const outerRadius = 70;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            color: "#1f2937",
            fontSize: "12px",
            fontWeight: "500",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
          formatter={(value: any, name: any) => [
            `${value} tes (${((value / data.total_tests) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
