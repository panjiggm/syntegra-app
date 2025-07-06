import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
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
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Clock,
  Trash,
} from "lucide-react";
import type { GetUsersResponse } from "~/hooks/use-users";
import { Link } from "react-router";
import { useUsersStore } from "~/stores/use-users-store";

interface User {
  id: string;
  name: string;
  email: string;
  nik?: string;
  role: string;
  gender?: string;
  phone?: string;
  province?: string;
  is_active: boolean;
  created_at: Date;
}

interface TableUserProps {
  usersData?: GetUsersResponse;
  isLoading: boolean;
  error: Error | null;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRefetch: () => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "other", label: "Lainnya" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function TableUser({
  usersData,
  isLoading,
  error,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRefetch,
}: TableUserProps) {
  const { openDeleteUserModal, openBulkDeleteModal } = useUsersStore();

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Get current page user IDs
  const currentPageUserIds = usersData?.data?.map((user) => user.id) || [];

  // Update select all state when data changes
  useEffect(() => {
    if (currentPageUserIds.length > 0) {
      const allCurrentPageSelected = currentPageUserIds.every((id) =>
        selectedUsers.includes(id)
      );
      setIsAllSelected(allCurrentPageSelected);
    } else {
      setIsAllSelected(false);
    }
  }, [selectedUsers, currentPageUserIds]);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Add all current page users to selection
      const newSelected = [
        ...new Set([...selectedUsers, ...currentPageUserIds]),
      ];
      setSelectedUsers(newSelected);
    } else {
      // Remove all current page users from selection
      const newSelected = selectedUsers.filter(
        (id) => !currentPageUserIds.includes(id)
      );
      setSelectedUsers(newSelected);
    }
  };

  // Handle individual user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedUsers.length > 0) {
      const userNames = usersData?.data
        ?.filter(user => selectedUsers.includes(user.id))
        ?.map(user => user.name) || [];
      
      openBulkDeleteModal(selectedUsers, userNames);
      setSelectedUsers([]);
    }
  };
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge className="bg-blue-100 text-blue-700">Admin</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-700">Peserta</Badge>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>Daftar Users</CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedUsers.length} dipilih
                </Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="h-8"
                >
                  <Trash className="size-4 mr-1" />
                  Hapus Terpilih
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Gagal memuat data users</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={onRefetch} variant="outline" size="sm">
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Pilih semua user"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="w-[70px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <LoadingSpinner size="lg" />
                      </TableCell>
                    </TableRow>
                  ) : usersData?.data && usersData.data.length > 0 ? (
                    usersData.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) =>
                              handleUserSelect(user.id, Boolean(checked))
                            }
                            aria-label={`Pilih user ${user.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium hover:underline cursor-pointer">
                              <Link to={`/admin/users/${user.id}`}>
                                {user.name}
                              </Link>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                            {user.nik && (
                              <div className="text-xs text-muted-foreground">
                                NIK: {user.nik}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.gender
                            ? GENDER_OPTIONS.find(
                                (g) => g.value === user.gender
                              )?.label || user.gender
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            {user.phone && (
                              <div className="text-sm">{user.phone}</div>
                            )}
                            {user.province && (
                              <div className="text-xs text-muted-foreground">
                                {user.province}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(user.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
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
                                <Link to={`/admin/users/${user.id}`}>
                                  <Eye className="size-4 mr-2" />
                                  Lihat Detail
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/users/${user.id}/edit`}>
                                  <Edit className="size-4 mr-2" />
                                  Edit User
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 cursor-pointer"
                                onClick={() =>
                                  openDeleteUserModal(user.id, user.name)
                                }
                              >
                                <Trash2 className="size-4 mr-2" />
                                Hapus User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          Tidak ada data user ditemukan
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {usersData?.meta && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  sampai{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, usersData.meta.total)}
                  </span>{" "}
                  dari{" "}
                  <span className="font-medium">{usersData.meta.total}</span>{" "}
                  results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: usersData.meta.total_pages },
                      (_, i) => i + 1
                    )
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === usersData.meta.total_pages ||
                          Math.abs(page - currentPage) <= 1
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => onPageChange(page)}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= usersData.meta.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
