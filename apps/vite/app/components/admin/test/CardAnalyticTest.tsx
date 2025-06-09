import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Brain, FileText, NotepadTextDashed, BarChart3 } from "lucide-react";

interface TestStats {
  total_tests: number;
  active_tests: number;
  inactive_tests: number;
  archived_tests: number;
}

interface CardAnalyticTestProps {
  statsData?: TestStats;
  isLoading?: boolean;
}

function AnalyticCardSkeleton() {
  return (
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
}

export function CardAnalyticTest({
  statsData,
  isLoading,
}: CardAnalyticTestProps) {
  if (isLoading || !statsData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticCardSkeleton />
        <AnalyticCardSkeleton />
        <AnalyticCardSkeleton />
        <AnalyticCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tes</CardTitle>
          <Brain className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.total_tests}</div>
          <p className="text-xs text-muted-foreground">
            {statsData.total_tests} aktif
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tes Aktif</CardTitle>
          <FileText className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.active_tests}</div>
          <p className="text-xs text-muted-foreground">Dari semua tes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tes Nonaktif</CardTitle>
          <NotepadTextDashed className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.inactive_tests}</div>
          <p className="text-xs text-muted-foreground">
            {statsData.inactive_tests} nonaktif
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Draft</CardTitle>
          <BarChart3 className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsData.archived_tests}</div>
          <p className="text-xs text-muted-foreground">Arsip</p>
        </CardContent>
      </Card>
    </div>
  );
}
