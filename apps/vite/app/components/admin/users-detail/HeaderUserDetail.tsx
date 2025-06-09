import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Edit,
  RefreshCw,
  MoreVertical,
  Eye,
  FileText,
} from "lucide-react";

interface HeaderUserDetailProps {
  onBack: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function HeaderUserDetail({
  onBack,
  onRefresh,
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
        <Button variant="outline">
          <Edit className="size-4 mr-2" />
          Edit User
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="size-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="size-4 mr-2" />
              Generate Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Reset Password
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
