import {
  ArrowLeft,
  CheckCircle,
  Edit,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSessions, type Session } from "~/hooks/use-sessions";
import { useSessionDialogStore } from "~/stores/use-session-dialog-store";

interface HeaderSessionTestProps {
  session: Session;
  sessionId: string | undefined;
}

export const HeaderSessionTest = ({
  session,
  sessionId,
}: HeaderSessionTestProps) => {
  const { useGetSessionById } = useSessions();
  const { openDeleteSessionModal } = useSessionDialogStore();

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

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="link" size="sm" asChild>
          <Link to="/admin/sessions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{session.session_name}</h1>
            {getStatusBadge(
              session.status,
              session.is_active,
              session.is_expired
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Kode Session: {session.session_code}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleRefresh}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        {session.status === "draft" && (
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {["draft", "cancelled"].includes(session.status) && (
          <Button
            variant="destructive"
            className="bg-red-500 hover:bg-red-600 cursor-pointer"
            onClick={() =>
              openDeleteSessionModal(
                sessionId!,
                session.session_name,
                session.session_code
              )
            }
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus
          </Button>
        )}
      </div>
    </div>
  );
};
