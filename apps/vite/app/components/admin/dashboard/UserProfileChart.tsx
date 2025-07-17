import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useUserProfileChart } from "~/hooks/use-dashboard-user-profile-chart";
import { Badge } from "~/components/ui/badge";
import { Users, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface UserProfileChartProps {
  className?: string;
}

export function UserProfileChart({ className }: UserProfileChartProps) {
  const [selectedType, setSelectedType] = useState<
    "gender" | "education" | "religion"
  >("gender");

  const { data: profileData, isLoading, error } = useUserProfileChart();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Profil Demografis
          </CardTitle>
          <CardDescription>
            Distribusi peserta berdasarkan gender, pendidikan, dan agama
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
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
            <Users className="size-5" />
            Profil Demografis
          </CardTitle>
          <CardDescription>
            Distribusi peserta berdasarkan gender, pendidikan, dan agama
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-red-600 mb-2">Gagal memuat data profil</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileData) return null;

  // Get the selected section data
  const selectedSection = profileData.formattedSections.find(
    (section) => section.type === selectedType
  );

  const sectionOptions = [
    {
      value: "gender",
      label: "Gender",
      description: "Distribusi berdasarkan jenis kelamin",
    },
    {
      value: "education",
      label: "Pendidikan",
      description: "Distribusi berdasarkan tingkat pendidikan",
    },
    {
      value: "religion",
      label: "Agama",
      description: "Distribusi berdasarkan agama",
    },
  ];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle className="flex items-center pb-2">
              Profil Demografis
            </CardTitle>
            <CardDescription className="text-xs">
              {
                sectionOptions.find((opt) => opt.value === selectedType)
                  ?.description
              }
            </CardDescription>
          </div>
          <Select
            value={selectedType}
            onValueChange={(value: "gender" | "education" | "religion") =>
              setSelectedType(value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {selectedSection ? (
          <>
            {/* Section Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {selectedSection.total_users.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Peserta
                </div>
              </div>
              <div className="text-center">
                <Badge
                  variant="secondary"
                  className={selectedSection.formattedSummary.diversity_bg}
                >
                  {selectedSection.formattedSummary.diversity_level}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  Diversitas
                </div>
              </div>
            </div>

            {/* Single Chart */}
            <div className="space-y-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedSection.chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      innerRadius={35}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {selectedSection.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} peserta`,
                        name,
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Section Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <TrendingUp className="size-3 text-green-600" />
                  <span>{selectedSection.summary.most_common}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="size-3 text-red-600" />
                  <span>{selectedSection.summary.least_common}</span>
                </div>
              </div>
            </div>

            {/* Diversity Score Details */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30">
              <div className="text-sm font-medium mb-2">Detail Diversitas</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Jumlah Terbanyak:</span>
                  <span>
                    {selectedSection.summary.most_common_count} peserta
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Jumlah Tersedikit:</span>
                  <span>
                    {selectedSection.summary.least_common_count} peserta
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground">
              Tidak ada data untuk kategori yang dipilih
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
