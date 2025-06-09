import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  FileText,
  BarChart3,
  Users,
  PieChart,
  RefreshCw,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Calendar,
  Target,
} from "lucide-react";
import { useReports } from "~/hooks/use-reports";
import type { Route } from "./+types/admin.reports";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Reports - Syntegra Admin" },
    { name: "description", content: "Kelola dan lihat laporan assessment" },
  ];
}

export default function AdminReportsPage() {
  const [refreshingStats, setRefreshingStats] = useState(false);

  // API calls
  const { useGetReportStats, useGetReportHealth, useGetReportConfig } =
    useReports();
  const statsQuery = useGetReportStats();
  const healthQuery = useGetReportHealth();
  const configQuery = useGetReportConfig();

  // Handle refresh stats
  const handleRefreshStats = async () => {
    setRefreshingStats(true);
    await Promise.all([statsQuery.refetch(), healthQuery.refetch()]);
    setRefreshingStats(false);
  };

  // Loading state
  if (statsQuery.isLoading || healthQuery.isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-96 bg-muted animate-pulse rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1"></div>
                <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (statsQuery.error || healthQuery.error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Kelola dan lihat laporan assessment psikologi
          </p>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Gagal Memuat Data Reports
            </h3>
            <p className="text-muted-foreground mb-4">
              {statsQuery.error?.message ||
                healthQuery.error?.message ||
                "Terjadi kesalahan saat memuat data"}
            </p>
            <Button onClick={handleRefreshStats} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = statsQuery.data?.data;
  const health = healthQuery.data?.data;
  const config = configQuery.data?.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Kelola dan lihat laporan assessment psikologi
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshStats}
            disabled={refreshingStats}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshingStats ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Jenis Report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/reports/individual/new">
                  <FileText className="mr-2 h-4 w-4" />
                  Individual Report
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/reports/session/new">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Session Summary
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/reports/comparative/new">
                  <PieChart className="mr-2 h-4 w-4" />
                  Comparative Analysis
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/reports/batch/new">
                  <Users className="mr-2 h-4 w-4" />
                  Batch Results
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* System Health Status */}
      {health && (
        <Card
          className={
            health.status === "healthy"
              ? "border-green-200 bg-green-50"
              : health.status === "degraded"
                ? "border-yellow-200 bg-yellow-50"
                : "border-red-200 bg-red-50"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {health.status === "healthy" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : health.status === "degraded" ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Report services are {health.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Database response: {health.database.response_time_ms}ms
                </p>
              </div>
              <Badge
                variant={
                  health.status === "healthy"
                    ? "default"
                    : health.status === "degraded"
                      ? "secondary"
                      : "destructive"
                }
              >
                {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Test Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Test Results
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.total_test_results?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Data tersedia untuk laporan individual
            </p>
          </CardContent>
        </Card>

        {/* Total Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.total_sessions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Session untuk summary & comparative
            </p>
          </CardContent>
        </Card>

        {/* Total Participants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Participants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.total_participants?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Peserta untuk batch reports
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.recent_results_30_days?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Hasil tes 30 hari terakhir
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Types Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Individual Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Individual Reports
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Laporan assessment mendalam untuk individu peserta
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Psychological Profile</p>
                <p className="text-sm text-muted-foreground">
                  Trait analysis, strengths & development areas
                </p>
              </div>
              <Badge variant="outline">PDF/JSON</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Performance Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Test scores, completion rates & time efficiency
                </p>
              </div>
              <Badge variant="outline">Charts</Badge>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to="/admin/reports/individual">
                  <Eye className="h-4 w-4 mr-2" />
                  Browse Reports
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/reports/individual/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session Summary Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Session Summary Reports
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Overview lengkap per sesi assessment
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Participation Statistics</p>
                <p className="text-sm text-muted-foreground">
                  Registration, completion & dropout rates
                </p>
              </div>
              <Badge variant="outline">Analytics</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Test Module Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Difficulty level & performance distribution
                </p>
              </div>
              <Badge variant="outline">Insights</Badge>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to="/admin/reports/session">
                  <Eye className="h-4 w-4 mr-2" />
                  Browse Reports
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/reports/session/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparative Analysis Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Comparative Analysis Reports
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Perbandingan performa antar peserta dalam sesi
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Participant Rankings</p>
                <p className="text-sm text-muted-foreground">
                  Statistical analysis & peer comparison
                </p>
              </div>
              <Badge variant="outline">Rankings</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Hiring Recommendations</p>
                <p className="text-sm text-muted-foreground">
                  Decision criteria & position fit analysis
                </p>
              </div>
              <Badge variant="outline">AI-powered</Badge>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to="/admin/reports/comparative">
                  <Eye className="h-4 w-4 mr-2" />
                  Browse Reports
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/reports/comparative/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Batch Results Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              Batch Results Reports
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Export massal hasil assessment dalam format Excel/CSV
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Excel/CSV Export</p>
                <p className="text-sm text-muted-foreground">
                  Customizable data fields & formats
                </p>
              </div>
              <Badge variant="outline">Export</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bulk Processing</p>
                <p className="text-sm text-muted-foreground">
                  Handle up to {config?.limits?.max_participants_batch || 1000}{" "}
                  participants
                </p>
              </div>
              <Badge variant="outline">Scalable</Badge>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to="/admin/reports/batch">
                  <Eye className="h-4 w-4 mr-2" />
                  Browse Reports
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/reports/batch/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Capacity & Limits */}
      {stats?.report_generation_capacity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Capacity & Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Individual Reports
                  </span>
                  <Badge variant="outline">
                    {
                      stats.report_generation_capacity
                        .individual_reports_per_hour
                    }
                    /hour
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Batch Reports</span>
                  <Badge variant="outline">
                    {stats.report_generation_capacity.batch_reports_per_hour}
                    /hour
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Concurrent Processing
                  </span>
                  <Badge variant="outline">
                    {stats.report_generation_capacity.max_concurrent_reports}{" "}
                    reports
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Batch Size</span>
                  <Badge variant="outline">
                    {config?.limits?.max_participants_batch || 1000}{" "}
                    participants
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Availability</span>
                  <div className="flex gap-1">
                    <Badge
                      variant={
                        stats.data_availability.has_test_results
                          ? "default"
                          : "secondary"
                      }
                    >
                      Results
                    </Badge>
                    <Badge
                      variant={
                        stats.data_availability.has_sessions
                          ? "default"
                          : "secondary"
                      }
                    >
                      Sessions
                    </Badge>
                    <Badge
                      variant={
                        stats.data_availability.has_participants
                          ? "default"
                          : "secondary"
                      }
                    >
                      Participants
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Test Results</p>
                  <p className="text-sm text-muted-foreground">
                    Available for individual reports
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.recent_results_30_days?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">results</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Created in last 30 days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.recent_sessions_30_days?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">sessions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link to="/admin/sessions">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Active Sessions
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link to="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Participants
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link to="/admin/tests">
                  <FileText className="h-4 w-4 mr-2" />
                  Configure Tests
                </Link>
              </Button>
              <Separator />
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => window.open("/admin/reports/health", "_blank")}
              >
                <Activity className="h-4 w-4 mr-2" />
                System Health Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
