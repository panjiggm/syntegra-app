import { useState, useMemo } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useUsers } from "~/hooks/use-users";
import { UserPlus, RefreshCw, UserCheck, Users } from "lucide-react";
import { CardAnalyticUser } from "~/components/admin/users/CardAnalyticUser";
import { FilterUser } from "~/components/admin/users/FilterUser";
import { TableUser } from "~/components/admin/users/TableUser";

export function meta() {
  return [
    { title: "Manajemen Users - Syntegra Psikotes" },
    { name: "description", content: "Kelola pengguna dan peserta psikotes" },
  ];
}

interface FilterState {
  search: string;
  role: string;
  gender: string;
  religion: string;
  education: string;
  province: string;
  is_active: string;
  sort_by: string;
  sort_order: "asc" | "desc";
}

const initialFilters: FilterState = {
  search: "",
  role: "",
  gender: "",
  religion: "",
  education: "",
  province: "",
  is_active: "",
  sort_by: "created_at",
  sort_order: "desc",
};

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { useGetUsers } = useUsers();

  // Build query parameters
  const queryParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: pageSize,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };

    // Add non-empty filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== "sort_by" && key !== "sort_order") {
        params[key] = value;
      }
    });

    return params;
  }, [filters, currentPage, pageSize]);

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
  } = useGetUsers(queryParams);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  console.log("usersData", usersData);

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Users</h1>
          <p className="text-muted-foreground">
            Kelola pengguna, admin, dan peserta psikotes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`size-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="size-4 mr-2" />
                Tambah User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Pilih Jenis User</DialogTitle>
                <DialogDescription>
                  Pilih jenis pengguna yang ingin Anda buat
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    // Navigate to create admin form
                    console.log("Create Admin");
                  }}
                >
                  <UserCheck className="size-4 mr-2" />
                  Buat Admin Baru
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    // Navigate to create participant form
                    console.log("Create Participant");
                  }}
                >
                  <Users className="size-4 mr-2" />
                  Daftarkan Peserta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Cards */}
      <CardAnalyticUser usersData={usersData} isLoading={isLoading} />

      {/* Filters */}
      <FilterUser
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />

      {/* Users Table */}
      <TableUser
        usersData={usersData}
        isLoading={isLoading}
        error={error}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onRefetch={refetch}
      />
    </>
  );
}
