import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Skeleton } from "~/components/ui/skeleton";

import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Mail,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
} from "lucide-react";

import type { Session } from "~/hooks/use-sessions";
import { useSessionParticipants } from "~/hooks/use-session-participants";
import { useBulkParticipantsDialogStore } from "~/stores/use-bulk-participants-dialog-store";
import { DialogBulkParticipants } from "./DialogBulkParticipants";
import { formatDateTime } from "~/lib/utils/date";
import { toast } from "sonner";

interface TabParticipantProps {
  session: Session;
}

export const TabParticipant = ({ session }: TabParticipantProps) => {
  // Filter and pagination states
  const [filters, setFilters] = useState<any>({
    page: 1,
    limit: 10,
    search: "",
    status: undefined as string | undefined,
    invitation_sent: undefined as boolean | undefined,
    registered: undefined as boolean | undefined,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  });

  // Hooks
  const {
    useGetSessionParticipants,
    useUpdateParticipantStatus,
    useRemoveParticipant,
  } = useSessionParticipants();

  const { openBulkParticipantsDialog } = useBulkParticipantsDialogStore();

  const {
    data: participantsResponse,
    isLoading,
    error,
    refetch,
  } = useGetSessionParticipants(session.id, filters);

  const updateStatusMutation = useUpdateParticipantStatus();
  const removeParticipantMutation = useRemoveParticipant();

  // Update filter function
  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value, // Reset to page 1 when filtering
    }));
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "invited":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Diundang
          </Badge>
        );
      case "registered":
        return <Badge className="bg-green-100 text-green-700">Terdaftar</Badge>;
      case "started":
        return <Badge className="bg-yellow-100 text-yellow-700">Dimulai</Badge>;
      case "completed":
        return <Badge className="bg-purple-100 text-purple-700">Selesai</Badge>;
      case "no_show":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700">
            Tidak Hadir
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Action handlers
  const handleUpdateStatus = async (
    participantId: string,
    newStatus: string,
    userName: string
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        sessionId: session.id,
        participantId,
        data: { status: newStatus as any },
      });
    } catch (error) {
      console.error("Update status error:", error);
    }
  };

  const handleRemoveParticipant = async (
    participantId: string,
    userName: string
  ) => {
    try {
      await removeParticipantMutation.mutateAsync({
        sessionId: session.id,
        participantId,
      });
    } catch (error) {
      console.error("Remove participant error:", error);
    }
  };

  const handleCopyAccessUrl = (accessUrl: string, userName: string) => {
    navigator.clipboard.writeText(accessUrl);
    toast.success("Link berhasil disalin!", {
      description: `Link akses untuk ${userName} telah disalin ke clipboard`,
    });
  };

  const handleAddParticipant = () => {
    openBulkParticipantsDialog(session.id, session.session_name);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Pagination data
  const participants = participantsResponse?.data || [];
  const meta = participantsResponse?.meta;
  const sessionInfo = participantsResponse?.session_info;

  // Loading skeleton for table rows
  const TableRowSkeleton = () => (
    <TableRow>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* Bulk Participants Dialog */}
      <DialogBulkParticipants />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Peserta Test</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={handleAddParticipant}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Peserta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <Label htmlFor="search">Cari Peserta</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari berdasarkan nama, NIK, atau email..."
                      value={filters.search}
                      onChange={(e) => updateFilter("search", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      updateFilter(
                        "status",
                        value === "all" ? undefined : value
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="invited">Diundang</SelectItem>
                      <SelectItem value="registered">Terdaftar</SelectItem>
                      <SelectItem value="started">Dimulai</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="no_show">Tidak Hadir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invitation Status Filter */}
                <div>
                  <Label htmlFor="invitation-filter">Undangan</Label>
                  <Select
                    value={
                      filters.invitation_sent === undefined
                        ? "all"
                        : filters.invitation_sent.toString()
                    }
                    onValueChange={(value) => {
                      const boolValue =
                        value === "all" ? undefined : value === "true";
                      updateFilter("invitation_sent", boolValue);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="true">Sudah Dikirim</SelectItem>
                      <SelectItem value="false">Belum Dikirim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Peserta
                {meta && (
                  <Badge variant="outline" className="ml-2">
                    {meta.total} peserta
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <p className="text-red-600 mb-2">Gagal memuat data peserta</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error.message}
                  </p>
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Coba Lagi
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Peserta</TableHead>
                          <TableHead>Kontak</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Terdaftar</TableHead>
                          <TableHead>Undangan</TableHead>
                          <TableHead className="w-[70px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          // Loading skeletons
                          Array.from({ length: filters.limit }).map((_, i) => (
                            <TableRowSkeleton key={i} />
                          ))
                        ) : participants.length > 0 ? (
                          participants.map((participant) => (
                            <TableRow key={participant.id}>
                              {/* Peserta Info */}
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {participant.user.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    NIK: {participant.user.nik || "Tidak ada"}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Kontak */}
                              <TableCell>
                                <div className="text-sm">
                                  <div>{participant.user.email}</div>
                                  {participant.user.phone && (
                                    <div className="text-muted-foreground">
                                      {participant.user.phone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                {getStatusBadge(participant.status)}
                              </TableCell>

                              {/* Terdaftar */}
                              <TableCell>
                                {participant.registered_at ? (
                                  <div className="text-sm">
                                    {formatDateTime(participant.registered_at)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    Belum terdaftar
                                  </span>
                                )}
                              </TableCell>

                              {/* Undangan */}
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {participant.invitation_sent_at ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700"
                                    >
                                      Terkirim
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      Belum dikirim
                                    </Badge>
                                  )}
                                  {participant.is_link_expired && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      Expired
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Actions */}
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

                                    {/* Copy Access Link */}
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleCopyAccessUrl(
                                          participant.access_url,
                                          participant.user.name
                                        )
                                      }
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy Link Akses
                                    </DropdownMenuItem>

                                    {/* Status Updates */}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>
                                      Ubah Status
                                    </DropdownMenuLabel>

                                    {participant.status !== "registered" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            participant.id,
                                            "registered",
                                            participant.user.name
                                          )
                                        }
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Tandai Terdaftar
                                      </DropdownMenuItem>
                                    )}

                                    {participant.status !== "no_show" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateStatus(
                                            participant.id,
                                            "no_show",
                                            participant.user.name
                                          )
                                        }
                                        className="text-red-600"
                                      >
                                        <UserX className="h-4 w-4 mr-2" />
                                        Tandai Tidak Hadir
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    {/* Remove Participant */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Hapus Peserta
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Hapus Peserta
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Apakah Anda yakin ingin menghapus{" "}
                                            <strong>
                                              {participant.user.name}
                                            </strong>{" "}
                                            dari session ini? Tindakan ini tidak
                                            dapat dibatalkan.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Batal
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleRemoveParticipant(
                                                participant.id,
                                                participant.user.name
                                              )
                                            }
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Hapus Peserta
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                              <p className="text-muted-foreground">
                                Belum ada peserta yang terdaftar
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Klik "Tambah Peserta" untuk menambahkan peserta
                                baru
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {meta && meta.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Menampilkan{" "}
                        {(meta.current_page - 1) * meta.per_page + 1}-
                        {Math.min(
                          meta.current_page * meta.per_page,
                          meta.total
                        )}{" "}
                        dari {meta.total} peserta
                      </div>

                      <div className="flex items-center gap-2">
                        {/* First Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilter("page", 1)}
                          disabled={!meta.has_prev_page}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>

                        {/* Previous Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateFilter("page", meta.current_page - 1)
                          }
                          disabled={!meta.has_prev_page}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page Info */}
                        <span className="text-sm font-medium px-2">
                          {meta.current_page} / {meta.total_pages}
                        </span>

                        {/* Next Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateFilter("page", meta.current_page + 1)
                          }
                          disabled={!meta.has_next_page}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* Last Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilter("page", meta.total_pages)}
                          disabled={!meta.has_next_page}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
