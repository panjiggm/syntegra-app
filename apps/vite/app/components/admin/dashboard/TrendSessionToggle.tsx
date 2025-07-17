import { useState } from "react";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { AlertCircle, RefreshCw, TrendingUp, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useTrendLine,
  type TrendPeriod,
} from "~/hooks/use-dashboard-trend-line";
import { useSessionArea } from "~/hooks/use-dashboard-session-area";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ViewType = "trend" | "session";

interface TrendSessionToggleProps {
  onViewChange?: (view: ViewType) => void;
  onPeriodChange?: (period: TrendPeriod) => void;
}

export function TrendSessionToggle({
  onViewChange,
  onPeriodChange,
}: TrendSessionToggleProps) {
  const [activeView, setActiveView] = useState<ViewType>("trend");
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("daily");

  // Fetch data based on active view
  const trendQuery = useTrendLine(
    { period: trendPeriod, range: "30d" },
    { enabled: activeView === "trend" }
  );

  const sessionQuery = useSessionArea({ enabled: activeView === "session" });

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    onViewChange?.(view);
  };

  const handleRefresh = () => {
    if (activeView === "trend") {
      trendQuery.refetch();
    } else {
      sessionQuery.refetch();
    }
  };

  const handlePeriodChange = (period: TrendPeriod) => {
    setTrendPeriod(period);
    onPeriodChange?.(period);
  };

  // Get current view state
  const currentIsLoading =
    activeView === "trend" ? trendQuery.isLoading : sessionQuery.isLoading;
  const currentError =
    activeView === "trend" ? trendQuery.error : sessionQuery.error;

  return (
    <div className="space-y-4">
      {/* Toggle Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={activeView === "trend" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("trend")}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Total Tes
          </Button>
          <Button
            variant={activeView === "session" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("session")}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Total Sesi Tes
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {activeView === "trend" && (
            <Select value={trendPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={currentIsLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${currentIsLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Chart Content */}
      <div className="h-80">
        {currentIsLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : currentError ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-sm text-red-600 font-medium">
              Gagal memuat data {activeView === "trend" ? "trend" : "session"}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {(currentError as Error)?.message ||
                "Terjadi kesalahan saat memuat data"}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        ) : activeView === "trend" && trendQuery.data ? (
          <TrendLineChart data={trendQuery.data} />
        ) : activeView === "session" && sessionQuery.data ? (
          <SessionAreaChart data={sessionQuery.data} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Tidak ada data untuk ditampilkan
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {!currentIsLoading && !currentError && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {activeView === "trend" && trendQuery.data && (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Total
                </p>
                <p className="text-lg font-bold">
                  {trendQuery.data.total_count?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Rata-rata
                </p>
                <p className="text-lg font-bold">
                  {trendQuery.data.formattedSummary?.average_per_period?.toFixed(
                    1
                  ) || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Perubahan
                </p>
                <p
                  className={`text-lg font-bold ${trendQuery.data.formattedSummary?.trend_direction_color}`}
                >
                  {trendQuery.data.formattedSummary?.percentage_change >= 0
                    ? "+"
                    : ""}
                  {trendQuery.data.formattedSummary?.percentage_change?.toFixed(
                    1
                  ) || 0}
                  %
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Trend
                </p>
                <p
                  className={`text-lg font-bold ${trendQuery.data.formattedSummary?.trend_direction_color}`}
                >
                  {trendQuery.data.formattedSummary?.trend_direction_icon}
                </p>
              </div>
            </>
          )}

          {activeView === "session" && sessionQuery.data && (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sesi
                </p>
                <p className="text-lg font-bold">
                  {sessionQuery.data.total_sessions?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Rata-rata
                </p>
                <p className="text-lg font-bold">
                  {sessionQuery.data.formattedSummary?.average_per_month?.toFixed(
                    1
                  ) || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Perubahan
                </p>
                <p
                  className={`text-lg font-bold ${sessionQuery.data.formattedSummary?.trend_direction_color}`}
                >
                  {sessionQuery.data.formattedSummary?.percentage_change >= 0
                    ? "+"
                    : ""}
                  {sessionQuery.data.formattedSummary?.percentage_change?.toFixed(
                    1
                  ) || 0}
                  %
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Trend
                </p>
                <p
                  className={`text-lg font-bold ${sessionQuery.data.formattedSummary?.trend_direction_color}`}
                >
                  {sessionQuery.data.formattedSummary?.trend_direction_icon}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TrendLineChart({ data }: { data: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data.chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" fontSize={12} tick={{ fill: "#6b7280" }} />
        <YAxis fontSize={12} tick={{ fill: "#6b7280" }} />
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
          formatter={(value: any, name: any) => [`${value} Tes`, name]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SessionAreaChart({ data }: { data: any }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data.chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" fontSize={12} tick={{ fill: "#6b7280" }} />
        <YAxis fontSize={12} tick={{ fill: "#6b7280" }} />
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
          formatter={(value: any, name: any) => [`${value} Sesi Tes`, name]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorSessions)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
