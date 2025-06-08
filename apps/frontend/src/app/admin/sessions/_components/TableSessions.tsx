import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Calendar,
  MapPin,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings,
  Target,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { sessionHelpers } from "@/hooks/useSessions";

// Session Status Badge Component
const SessionStatusBadge = ({ status }: { status: string }) => {
  const { label, className } = sessionHelpers.getStatusBadge(status);
  return (
    <Badge className={className} variant="secondary">
      {label}
    </Badge>
  );
};

// Session Actions Component
const SessionActions = ({
  session,
  onEdit,
  onDelete,
  onViewDetails,
  onCopyLink,
}: {
  session: any;
  onEdit: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onViewDetails: (sessionId: string) => void;
  onCopyLink: (sessionCode: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Buka menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onViewDetails(session.id)}>
          <Eye className="mr-2 h-4 w-4" />
          Lihat Detail
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopyLink(session.session_code)}>
          <Copy className="mr-2 h-4 w-4" />
          Salin Link Peserta
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ExternalLink className="mr-2 h-4 w-4" />
          Buka Link Peserta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(session.id)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Sesi
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Kelola Peserta
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => onDelete(session.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus Sesi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface TableSessionsProps {
  sessions: any[];
  isLoading: boolean;
  error: any;
  selectedDate: Date;
  sessionsResponse: any;
  onRefetch: () => void;
  onNewSession: () => void;
  onPageChange: (page: number) => void;
  onEdit: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onViewDetails: (sessionId: string) => void;
  onCopyLink: (sessionCode: string) => void;
}

export const TableSessions = ({
  sessions,
  isLoading,
  error,
  selectedDate,
  sessionsResponse,
  onRefetch,
  onNewSession,
  onPageChange,
  onEdit,
  onDelete,
  onViewDetails,
  onCopyLink,
}: TableSessionsProps) => {
  // Format time for display
  const formatTime = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return format(dateObj, "HH:mm", { locale: id });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "--:--";
    }
  };

  // Format selected date for display
  const formatSelectedDate = (date: Date) => {
    try {
      return format(date, "EEEE, dd MMMM yyyy", { locale: id });
    } catch (error) {
      console.error("Error formatting selected date:", error);
      return "Invalid Date";
    }
  };

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Selected Date Info Skeleton */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Sesi Psikotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sesi</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Peserta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="space-y-4">
        {/* Selected Date Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Jadwal untuk {formatSelectedDate(selectedDate)}
            </h3>
          </div>
          <p className="text-sm text-blue-700 mt-1">Gagal memuat jadwal</p>
        </div>

        {/* Error State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Gagal Memuat Data</h3>
            <p className="text-muted-foreground text-center mb-4">
              Terjadi kesalahan saat memuat jadwal sesi
            </p>
            <Button onClick={onRefetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Early return for empty state
  if (sessions.length === 0) {
    return (
      <div className="space-y-4">
        {/* Selected Date Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Jadwal untuk {formatSelectedDate(selectedDate)}
            </h3>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Ditemukan 0 jadwal pada tanggal ini
          </p>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-24 w-24 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Tidak Ada Jadwal</h3>
            <p className="text-muted-foreground text-center mb-4">
              Belum ada jadwal untuk tanggal yang dipilih
            </p>
            <Button onClick={onNewSession}>Buat Jadwal Baru</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main component render - sessions exist
  return (
    <div className="space-y-4">
      {/* Selected Date Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">
            Jadwal untuk {formatSelectedDate(selectedDate)}
          </h3>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Ditemukan {sessions.length} jadwal pada tanggal ini
        </p>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Sesi Psikotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sesi</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Peserta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {session.session_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {session.target_position || "Umum"}
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                          {session.session_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {formatTime(session.start_time)} -{" "}
                          {formatTime(session.end_time)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sessionHelpers.getSessionDuration(session)} menit
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="max-w-[150px] truncate">
                          {session.location || "Tidak ditentukan"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sessionHelpers.formatParticipantsCount(
                          session.current_participants || 0,
                          session.max_participants
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SessionStatusBadge status={session.status} />
                    </TableCell>
                    <TableCell>
                      <SessionActions
                        session={session}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        onCopyLink={onCopyLink}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {sessionsResponse &&
            sessionsResponse.meta &&
            sessionsResponse.meta.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Halaman {sessionsResponse.meta.current_page} dari{" "}
                  {sessionsResponse.meta.total_pages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={
                          sessionsResponse.meta.has_prev_page
                            ? () =>
                                onPageChange(
                                  sessionsResponse.meta.current_page - 1
                                )
                            : undefined
                        }
                        className={
                          sessionsResponse.meta.has_prev_page
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-50"
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={
                          sessionsResponse.meta.has_next_page
                            ? () =>
                                onPageChange(
                                  sessionsResponse.meta.current_page + 1
                                )
                            : undefined
                        }
                        className={
                          sessionsResponse.meta.has_next_page
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-50"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
