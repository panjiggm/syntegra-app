import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useProvinceChart } from "~/hooks/use-dashboard-province-chart";
import { Badge } from "~/components/ui/badge";
import { MapPin, Trophy, Users, TrendingUp } from "lucide-react";

interface ProvinceChartProps {
  className?: string;
}

export function ProvinceChart({ className }: ProvinceChartProps) {
  const { data: provinceData, isLoading, error } = useProvinceChart();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            Distribusi Wilayah
          </CardTitle>
          <CardDescription>
            Sebaran peserta berdasarkan provinsi
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
            <MapPin className="size-5" />
            Distribusi Wilayah
          </CardTitle>
          <CardDescription>
            Sebaran peserta berdasarkan provinsi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-80 text-center">
            <p className="text-red-600 mb-2">Gagal memuat data wilayah</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!provinceData) return null;

  // Get top 10 provinces for better visualization
  const topProvinces = provinceData.chartData.slice(0, 10);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.formattedValue} ({data.formattedPercentage})
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
          Distribusi Wilayah
        </CardTitle>
        <CardDescription className="text-xs">
          Sebaran peserta berdasarkan provinsi
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {provinceData.total_users.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Peserta</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {provinceData.provinces_count}
            </div>
            <div className="text-xs text-muted-foreground">Provinsi Aktif</div>
          </div>
        </div>

        {/* Top 3 Provinces */}
        <div className="mb-6">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Trophy className="size-4" />
            Top 3 Provinsi
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {provinceData.formattedSummary.formatted_top_3.map((prov) => (
              <div
                key={prov.province}
                className="text-center p-2 rounded-lg bg-muted/50"
              >
                <div className={`text-lg font-bold ${prov.medalColor}`}>
                  #{prov.rank}
                </div>
                <div className="text-xs font-medium truncate">
                  {prov.province}
                </div>
                <div className="text-xs text-muted-foreground">
                  {prov.formattedCount} ({prov.formattedPercentage})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="horizontal"
              data={topProvinces}
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={75}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
