import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Calendar,
} from "lucide-react";

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
  const formatTime = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "--:--";
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Aktif</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700">Selesai</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-700">Berakhir</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal {formatDate(selectedDate)}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefetch}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Jadwal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Gagal memuat data sesi</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={onRefetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Sesi</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Posisi Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Peserta</TableHead>
                    <TableHead className="w-[70px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <LoadingSpinner size="lg" />
                      </TableCell>
                    </TableRow>
                  ) : sessions && sessions.length > 0 ? (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {session.session_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {session.session_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatTime(session.start_time)} -{" "}
                            {formatTime(session.end_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {session.target_position || "Umum"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {session.total_participants || 0} peserta
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onViewDetails(session.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Lihat Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEdit(session.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onCopyLink(session.session_code)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(session.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          Tidak ada jadwal untuk tanggal ini
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
