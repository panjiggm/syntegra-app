import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, Target, FileText, Clock } from "lucide-react";

// Skeleton component for statistics cards
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </CardContent>
  </Card>
);

interface CardAnalyticsTestProps {
  stats?: {
    total_tests: number;
    active_tests: number;
    inactive_tests: number;
    avg_time_limit: number;
  };
  isLoading: boolean;
  error?: Error | null;
}

export default function CardAnalyticsTest({
  stats,
  isLoading,
  error,
}: CardAnalyticsTestProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {isLoading ? (
        <>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </>
      ) : error ? (
        <div className="col-span-4 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="size-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Gagal memuat statistik
            </p>
          </div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.total_tests || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tersedia dalam sistem
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tes Aktif</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.active_tests || 0}
              </div>
              <p className="text-xs text-muted-foreground">Siap digunakan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tidak Aktif</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.inactive_tests || 0}
              </div>
              <p className="text-xs text-muted-foreground">Tidak digunakan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rata-rata Durasi
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(stats?.avg_time_limit || 0)} min
              </div>
              <p className="text-xs text-muted-foreground">Waktu pengerjaan</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
