import { useState } from "react";
import { useParams, Link } from "react-router";
import type { Route } from "./+types/admin.sessions.$sessionId";

// UI Components
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { LoadingSpinner } from "~/components/ui/loading-spinner";

// Icons
import { ArrowLeft, RotateCcw, AlertCircle } from "lucide-react";

import { TabParticipant } from "~/components/admin/session/TabParticipant";
import { TabSettings } from "~/components/admin/session/TabSettings";
import { TabModuleTests } from "~/components/admin/session/TabModuleTests";
import { TabOverview } from "~/components/admin/session/TabOverview";
import { LinkSessionTestCard } from "~/components/admin/session/LinkSessionTestCard";
import { CardAnalyticsSession } from "~/components/admin/session/CardAnalyticsSession";
import { HeaderSessionTest } from "~/components/admin/session/HeaderSessionTest";

// Hooks and Utils
import { useSessions } from "~/hooks/use-sessions";
import { DialogDeleteSession } from "~/components/admin/session/DialogDeleteSession";
import { Badge } from "~/components/ui/badge";

// Meta function for SEO
export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Detail Session ${params.sessionId} - Syntegra Psikotes` },
    { name: "description", content: "Detail lengkap sesi tes psikologi" },
  ];
}

export default function AdminSessionDetailPage() {
  const { sessionId } = useParams();
  //   const { openEditDialog } = useSessionDialogStore();
  const [activeTab, setActiveTab] = useState("overview");

  const { useGetSessionById } = useSessions();

  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useGetSessionById(sessionId!);

  console.log("session: ", session);

  const handleRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="link" size="sm" asChild>
            <Link to="/admin/sessions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="link" size="sm" asChild>
            <Link to="/admin/sessions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold">Session tidak ditemukan</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {error?.message ||
              "Session yang Anda cari tidak ditemukan atau telah dihapus."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Button asChild>
              <Link to="/admin/sessions">Kembali ke Daftar Session</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <HeaderSessionTest session={session} sessionId={sessionId} />

      {/* Quick Stats Cards */}
      <CardAnalyticsSession session={session} />

      {/* Participant Link Card */}
      {session.participant_link && <LinkSessionTestCard session={session} />}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="inline-flex">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 px-8"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2 px-8">
            Modul Tes
          </TabsTrigger>
          <TabsTrigger
            value="participants"
            className="flex items-center gap-2 px-8"
          >
            Peserta <Badge>{session.current_participants || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-2 px-8"
          >
            Pengaturan
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <TabOverview session={session} />
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <TabModuleTests session={session} />
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <TabParticipant session={session} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <TabSettings session={session} />
        </TabsContent>
      </Tabs>

      <DialogDeleteSession />
    </div>
  );
}
