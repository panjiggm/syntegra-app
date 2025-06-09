import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ArrowLeft, Edit, RefreshCw, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router";

interface HeaderUserDetailProps {
  onBack: () => void;
  onRefresh: () => void;
  onDelete?: (userId: string, userName: string) => void;
  userId?: string;
  userName?: string;
  isLoading?: boolean;
}

export function HeaderUserDetail({
  onBack,
  onRefresh,
  onDelete,
  userId,
  userName,
  isLoading,
}: HeaderUserDetailProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="link"
          size="sm"
          className="cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft className="size-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detail User</h1>
          <p className="text-muted-foreground text-sm">
            Informasi lengkap dan riwayat psikotes pengguna
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw
            className={`size-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

        {/* Test Delete Button */}
        {onDelete && userId && userName && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              console.log("Test delete button clicked");
              onDelete(userId, userName);
            }}
          >
            <Trash2 className="size-4 mr-2" />
            Test Delete
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link to={`/admin/users/${userId}/edit`}>
            <Edit className="size-4 mr-2" />
            Edit User
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem>
              <FileText className="size-4 mr-2" />
              Generate Report
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            {onDelete && userId && userName && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    console.log("Delete button clicked:", userId, userName);
                    onDelete(userId, userName);
                  }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Hapus Peserta
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
