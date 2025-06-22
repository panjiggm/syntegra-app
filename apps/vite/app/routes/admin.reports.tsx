import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useReports } from "~/hooks/use-reports";
import {
  TabIndividual,
  TabSession,
  EmptyDetailView,
  IndividualDetailView,
  SessionDetailView,
  type IndividualReportsListItem,
  type SessionReportsListItem,
} from "~/components/admin/reports";

import {
  FileText,
  Users,
  Activity,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { Route } from "./+types/admin.reports";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Laporan - Admin Syntegra Psikotes" },
    { name: "description", content: "Kelola dan generate laporan psikotes" },
  ];
}

export default function AdminReports() {
  return <ReportsContent />;
}

function ReportsContent() {
  const [selectedTab, setSelectedTab] = useState<string>("individual");

  // New state for the updated UI
  const [selectedIndividual, setSelectedIndividual] =
    useState<IndividualReportsListItem | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] =
    useState<SessionReportsListItem | null>(null);

  const { useGetReportStats, useGetReportHealth } = useReports();

  const { data: stats, isLoading: statsLoading } = useGetReportStats();

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
  } = useGetReportHealth();

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat dan analisa hasil laporan psikotes
          </p>
        </div>
      </div>

      {/* System Health & Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Sistem</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <LoadingSpinner size="sm" />
            ) : healthError ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {health?.data.status === "healthy" ? "Sehat" : "Bermasalah"}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Response: {health?.data.database.response_time_ms || 0}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hasil</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.total_test_results || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.data.recent_results_30_days || 0} hasil baru (30 hari)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sesi</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.total_sessions || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.data.recent_sessions_30_days || 0} sesi baru (30 hari)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kapasitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                stats?.data.report_generation_capacity
                  .individual_reports_per_hour || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Laporan per jam</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports Content */}
      <div>
        {/* New Layout: List and Detail View */}
        <div>
          {/* Tabs and Actions */}
          <Card>
            <CardContent className="p-6 pt-0">
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="individual" className="text-xs">
                      <Users className="h-4 w-4 mr-1" />
                      Peserta
                    </TabsTrigger>
                    <TabsTrigger value="session" className="text-xs">
                      <Calendar className="h-4 w-4 mr-1" />
                      Sesi Tes
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Grid Layout: 50-50 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
                  {/* Left Side: List */}
                  <div className="space-y-4">
                    <TabsContent value="individual" className="m-0">
                      <TabIndividual
                        onSelectIndividual={setSelectedIndividual}
                        selectedIndividual={selectedIndividual}
                      />
                    </TabsContent>

                    <TabsContent value="session" className="m-0">
                      <TabSession
                        onSelectSession={setSelectedSessionDetail}
                        selectedSession={selectedSessionDetail}
                      />
                    </TabsContent>
                  </div>

                  {/* Right Side: Detail View */}
                  <div className="space-y-4">
                    {selectedTab === "individual" && selectedIndividual ? (
                      <IndividualDetailView individual={selectedIndividual} />
                    ) : selectedTab === "session" && selectedSessionDetail ? (
                      <SessionDetailView session={selectedSessionDetail} />
                    ) : (
                      <EmptyDetailView activeTab={selectedTab} />
                    )}
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
