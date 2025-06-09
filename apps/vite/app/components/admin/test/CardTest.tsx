import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  Plus,
  Brain,
  Clock,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import type { TestData } from "~/hooks/use-tests";
import { Link } from "react-router";
import { useTestDialogStore } from "~/stores/use-test-dialog-store";

interface CardTestProps {
  tests: TestData[];
  hasFilters?: boolean;
  isLoading?: boolean;
}

export function CardTest({
  tests,
  hasFilters = false,
  isLoading = false,
}: CardTestProps) {
  const { openDeleteTestModal } = useTestDialogStore();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Aktif</Badge>;
      case "inactive":
        return <Badge variant="secondary">Nonaktif</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "archived":
        return <Badge variant="destructive">Arsip</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-muted-foreground">Memuat data tes...</span>
      </div>
    );
  }

  // Empty State
  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Brain className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Belum ada tes</h3>
        <p className="text-muted-foreground text-center mb-4">
          {hasFilters
            ? "Tidak ada tes yang sesuai dengan filter"
            : "Mulai dengan membuat tes psikologi pertama Anda"}
        </p>
        <Button>
          <Plus className="size-4 mr-2" />
          Tambah Tes
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tests.map((test) => (
        <Card key={test.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{test.icon}</span>
                <div>
                  <Link to={`/admin/tests/${test.id}`}>
                    <CardTitle className="text-lg hover:underline cursor-pointer">
                      {test.name}
                    </CardTitle>
                  </Link>
                  <CardDescription className="text-sm">
                    {test.category}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/admin/tests/${test.id}`}>
                      <Eye className="size-4 mr-2" />
                      Lihat
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/admin/tests/${test.id}/edit`}>
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDeleteTestModal(test.id, test.name)}
                    className="text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {getStatusBadge(test.status)}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {test.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span>{test.total_questions} soal</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>{test.time_limit} menit</span>
              </div>
            </div>

            {test.attempt_count !== undefined && (
              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Percobaan: {test.attempt_count}</span>
                  {test.average_score && (
                    <span>Rata-rata: {Math.round(test.average_score)}%</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
