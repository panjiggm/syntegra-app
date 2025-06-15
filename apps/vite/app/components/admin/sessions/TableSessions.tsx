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

// Date utilities
import { formatTime, formatDate } from "~/lib/utils/date";
import { Link } from "react-router";
import { useSessionDialogStore } from "~/stores/use-session-dialog-store";
import { SessionStatusBadge } from "~/components/session-status-badge";

interface TableSessionsProps {
  sessions: any[];
  isLoading: boolean;
  error: any;
  selectedDate: Date;
  sessionsResponse: any;
  onRefetch: () => void;
  onPageChange: (page: number) => void;
  onCopyLink: (sessionCode: string) => void;
}

export const TableSessions = ({
  sessions,
  isLoading,
  error,
  selectedDate,
  onRefetch,
  onCopyLink,
}: TableSessionsProps) => {
  const { openDeleteSessionModal } = useSessionDialogStore();

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
                            <Link
                              to={`/admin/sessions/${session.id}`}
                              className="hover:underline cursor-pointer"
                            >
                              <div className="font-medium">
                                {session.session_name}
                              </div>
                            </Link>
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
                        <TableCell>
                          <SessionStatusBadge session={session} />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {session.current_participants || 0} peserta
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
                              <Link to={`/admin/sessions/${session.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                onClick={() => onCopyLink(session.session_code)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  openDeleteSessionModal(
                                    session.id,
                                    session.session_name,
                                    session.session_code
                                  )
                                }
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
