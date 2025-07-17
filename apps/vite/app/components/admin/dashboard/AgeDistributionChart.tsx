import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useAgeBar } from "~/hooks/use-dashboard-age-bar";
import { Badge } from "~/components/ui/badge";
import { Calendar, BarChart3 } from "lucide-react";

interface AgeDistributionChartProps {
  className?: string;
}

export function AgeDistributionChart({ className }: AgeDistributionChartProps) {
  const { data: ageData, isLoading, error } = useAgeBar();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Distribusi Usia
          </CardTitle>
          <CardDescription>
            Sebaran peserta berdasarkan kelompok usia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-80">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Distribusi Usia
          </CardTitle>
          <CardDescription>
            Sebaran peserta berdasarkan kelompok usia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <p className="text-red-600 mb-2">Gagal memuat data usia</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ageData) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.displayLabel}</p>
          <p className="text-sm text-muted-foreground">
            {data.formattedValue} peserta ({data.formattedPercentage})
          </p>
          <p className="text-xs text-muted-foreground">
            Rentang: {data.rangeDisplay}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Distribusi Usia
        </CardTitle>
        <CardDescription className="text-xs">
          Sebaran peserta berdasarkan kelompok usia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {ageData.enhancedStatistics.formattedAverageAge}
            </div>
            <div className="text-xs text-muted-foreground">Usia Rata-rata</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {ageData.enhancedStatistics.formattedMedianAge}
            </div>
            <div className="text-xs text-muted-foreground">Usia Median</div>
          </div>
        </div>

        {/* Participation Rate */}
        <div className="mb-6 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Kelengkapan Data</span>
            <Badge variant="secondary">
              {ageData.participationRate.percentage}%
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {ageData.participationRate.withBirthDate.toLocaleString()} dari{" "}
            {ageData.participationRate.total.toLocaleString()} peserta memiliki
            data tanggal lahir
          </div>
        </div>

        {/* Age Distribution Chart */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ageData.chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age Insights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              <span className="text-sm font-medium">Kelompok Dominan</span>
            </div>
            <Badge variant="outline">
              {ageData.enhancedStatistics.formattedMostCommonAgeGroup}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
