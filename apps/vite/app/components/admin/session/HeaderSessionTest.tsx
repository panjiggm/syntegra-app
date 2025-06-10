import {
  ArrowLeft,
  CheckCircle,
  Edit,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSessions, type Session } from "~/hooks/use-sessions";

interface HeaderSessionTestProps {
  session: Session;
  sessionId: string | undefined;
}

export const HeaderSessionTest = ({
  session,
  sessionId,
}: HeaderSessionTestProps) => {
  const navigate = useNavigate();
  const { useDeleteSession, useGetSessionById } = useSessions();

  const deleteSessionMutation = useDeleteSession();
  const { refetch } = useGetSessionById(sessionId!);

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

  const handleRefresh = () => {
    refetch();
  };

  return (
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
  );
};
