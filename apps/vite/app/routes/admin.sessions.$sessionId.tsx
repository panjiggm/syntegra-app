import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import type { Route } from "./+types/admin.sessions.$sessionId";

// UI Components
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

// Icons
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Timer,
  Target,
  Settings,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Hooks and Utils
import { useSessions } from "~/hooks/use-sessions";
import { useSessionDialogStore } from "~/stores/use-session-dialog-store";
import { formatDateTime, formatTime, formatDate } from "~/lib/utils/date";
import { toast } from "sonner";

// Meta function for SEO
export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Detail Session ${params.sessionId} - Syntegra Psikotes` },
    { name: "description", content: "Detail lengkap sesi tes psikologi" },
  ];
}

export default function AdminSessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  //   const { openEditDialog } = useSessionDialogStore();
  const [activeTab, setActiveTab] = useState("overview");

  const { useGetSessionById, useDeleteSession } = useSessions();

  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useGetSessionById(sessionId!);

  console.log("session: ", session);

  const deleteSessionMutation = useDeleteSession();

  // Status badge component
  const getStatusBadge = (
    status: string,
    isActive: boolean,
    isExpired: boolean
  ) => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Berakhir
        </Badge>
      );
    }

    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-700 gap-1">
          <Play className="h-3 w-3" />
          Sedang Berlangsung
        </Badge>
      );
    }

    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-100 text-blue-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            Aktif
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="gap-1">
            <Edit className="h-3 w-3" />
            Draft
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            Selesai
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Action handlers
  const handleEdit = () => {
    // openEditDialog(sessionId!);
  };

  const handleDelete = async () => {
    try {
      await deleteSessionMutation.mutateAsync(sessionId!);
      navigate("/admin/sessions");
    } catch (error) {
      console.error("Delete session error:", error);
    }
  };

  const handleCopyParticipantLink = () => {
    if (session?.participant_link) {
      navigator.clipboard.writeText(session?.participant_link);
      toast.success("Link berhasil disalin!", {
        description: "Link partisipan telah disalin ke clipboard",
      });
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
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
          <Button variant="outline" size="sm" asChild>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/sessions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{session.session_name}</h1>
              {getStatusBadge(
                session.status,
                session.is_active,
                session.is_expired
              )}
            </div>
            <p className="text-muted-foreground">
              Kode Session: {session.session_code}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin menghapus session "
                  {session.session_name}"? Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Hapus Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Durasi Session
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {session.session_duration_hours} Jam
            </div>
            <p className="text-xs text-muted-foreground">
              {session.total_test_time_minutes} menit total tes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Soal</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {session.total_questions}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.session_modules?.length || 0} modul tes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peserta</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {session.current_participants}
              {session.max_participants && `/${session.max_participants}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.max_participants ? "Terbatas" : "Tidak terbatas"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posisi Target</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {session.target_position || "Umum"}
            </div>
            <p className="text-xs text-muted-foreground">Target kandidat</p>
          </CardContent>
        </Card>
      </div>

      {/* Participant Link Card */}
      {session.participant_link && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Link Partisipan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-white rounded border font-mono text-sm">
                {session.participant_link}
              </div>
              <Button variant="outline" onClick={handleCopyParticipantLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button asChild>
                <a
                  href={session.participant_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Buka
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modul Tes</TabsTrigger>
          <TabsTrigger value="participants">Peserta</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Dasar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Waktu Pelaksanaan</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(session.start_time)} -{" "}
                      {formatTime(session.end_time)}
                    </p>
                  </div>
                </div>

                {session.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Lokasi</p>
                      <p className="text-sm text-muted-foreground">
                        {session.location}
                      </p>
                    </div>
                  </div>
                )}

                {session.description && (
                  <div>
                    <p className="font-medium mb-2">Deskripsi</p>
                    <p className="text-sm text-muted-foreground">
                      {session.description}
                    </p>
                  </div>
                )}

                {session.time_remaining && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Waktu Tersisa</p>
                      <p className="text-sm text-muted-foreground">
                        {session.time_remaining}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Tim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.proctor && (
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Proktor</p>
                      <p className="text-sm text-muted-foreground">
                        {session.proctor.name} ({session.proctor.email})
                      </p>
                    </div>
                  </div>
                )}

                {session.created_by_user && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Dibuat oleh</p>
                      <p className="text-sm text-muted-foreground">
                        {session.created_by_user.name} •{" "}
                        {formatDateTime(session.created_at)}
                      </p>
                    </div>
                  </div>
                )}

                {session.updated_by_user &&
                  session.updated_by_user.id !==
                    session.created_by_user?.id && (
                    <div className="flex items-center gap-3">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Terakhir diubah</p>
                        <p className="text-sm text-muted-foreground">
                          {session.updated_by_user.name} •{" "}
                          {formatDateTime(session.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Modul Tes ({session.session_modules?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session.session_modules && session.session_modules.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Urutan</TableHead>
                        <TableHead>Nama Tes</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead>Soal</TableHead>
                        <TableHead>Bobot</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.session_modules
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((module) => (
                          <TableRow key={module.id}>
                            <TableCell>
                              <Badge variant="outline">{module.sequence}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {module.test.icon && (
                                  <span className="text-lg">
                                    {module.test.icon}
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {module.test.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {module.test.module_type}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {module.test.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {module.test.time_limit} menit
                            </TableCell>
                            <TableCell>
                              {module.test.total_questions} soal
                            </TableCell>
                            <TableCell>{module.weight}x</TableCell>
                            <TableCell>
                              {module.is_required ? (
                                <Badge className="bg-red-100 text-red-700">
                                  Wajib
                                </Badge>
                              ) : (
                                <Badge variant="outline">Opsional</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Belum ada modul tes yang ditambahkan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Peserta Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Fitur manajemen peserta akan segera hadir</p>
                <p className="text-sm">
                  Saat ini terdapat {session.current_participants} peserta
                  terdaftar
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Kadaluarsa Otomatis
                  </label>
                  <div className="flex items-center gap-2">
                    {session.auto_expire ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {session.auto_expire ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Izinkan Masuk Terlambat
                  </label>
                  <div className="flex items-center gap-2">
                    {session.allow_late_entry ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {session.allow_late_entry
                        ? "Diizinkan"
                        : "Tidak Diizinkan"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Session ID</label>
                <code className="block p-2 bg-gray-100 rounded text-sm font-mono">
                  {session.id}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
