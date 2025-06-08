"use client";

import React, { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { UserData, GetUsersRequest } from "shared-types";
import { useModalStore } from "@/stores/useModalStore";
// import { UserDetailDrawer } from "./UserDetailDrawer";

interface UsersResponse {
  data: UserData[];
  meta: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total: number;
    has_prev_page: boolean;
    has_next_page: boolean;
  };
}

interface TableUserProps {
  usersResponse: UsersResponse | undefined;
  isLoading: boolean;
  error: any;
  filters: GetUsersRequest;
  onFilterChange: (key: keyof GetUsersRequest, value: any) => void;
  onPageChange: (page: number) => void;
  onEditUser: (userId: string) => void;
}

export function TableUser({
  usersResponse,
  isLoading,
  error,
  filters,
  onFilterChange,
  onPageChange,
  onEditUser,
}: TableUserProps) {
  const { openDeleteUserModal } = useModalStore();

  // State for user detail drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Cleanup effect to reset state when component unmounts
  useEffect(() => {
    return () => {
      setSelectedUserId(null);
      setSelectedUserName("");
      setIsDetailDrawerOpen(false);
    };
  }, []);

  // Format age from birth_date
  const calculateAge = (birthDate: Date | null) => {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return age - 1;
    }
    return age;
  };

  // Get status badge
  const getStatusBadge = (user: UserData) => {
    // Mock logic for status - this would be based on test results
    const rand = Math.random();
    if (rand < 0.25)
      return <Badge className="bg-green-100 text-green-800">Lulus</Badge>;
    if (rand < 0.5)
      return <Badge className="bg-blue-100 text-blue-800">Sedang Test</Badge>;
    if (rand < 0.75)
      return <Badge className="bg-yellow-100 text-yellow-800">Terjadwal</Badge>;
    return <Badge className="bg-gray-100 text-gray-800">Belum Test</Badge>;
  };

  const handleDeleteUser = (user: UserData) => {
    openDeleteUserModal(user.id, user.name);
  };

  const handleViewUserDetail = (user: UserData) => {
    console.log("View user detail:", user.name);
  };

  const handleCloseDetailDrawer = () => {
    setIsDetailDrawerOpen(false);
    setSelectedUserId(null);
    setSelectedUserName("");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Peserta</CardTitle>
          <CardDescription>
            {usersResponse?.meta && (
              <span>
                Menampilkan{"  "}
                {(usersResponse.meta.current_page - 1) *
                  usersResponse.meta.per_page +
                  1}{" "}
                dari {usersResponse.meta.total} peserta
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Memuat data...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-destructive">Gagal memuat data peserta</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peserta</TableHead>
                      <TableHead>Jenis Kelamin</TableHead>
                      <TableHead>Usia</TableHead>
                      <TableHead>Domisili</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal Daftar</TableHead>
                      <TableHead className="w-[50px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersResponse?.data?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div
                              className="font-semibold text-sm hover:underline cursor-pointer"
                              onClick={() => handleViewUserDetail(user)}
                            >
                              {user.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {user.gender === "male"
                            ? "Laki-laki"
                            : user.gender === "female"
                              ? "Perempuan"
                              : "Lainnya"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {calculateAge(user.birth_date)} tahun
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {user.birth_date
                                ? new Date(user.birth_date).toLocaleDateString(
                                    "id-ID",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[150px] truncate">
                              {user.regency && user.province
                                ? `${user.regency}, ${user.province}`
                                : user.address || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{user.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {getStatusBadge(user)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(user.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewUserDetail(user)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Lihat Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEditUser(user.id)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Peserta
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus Peserta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {usersResponse?.meta && (
                <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {usersResponse.meta.current_page} dari{" "}
                      {usersResponse.meta.total_pages} halaman
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tampilkan
                      </span>
                      <Select
                        value={filters.limit.toString()}
                        onValueChange={(value) =>
                          onFilterChange("limit", parseInt(value, 10))
                        }
                      >
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        per halaman
                      </span>
                    </div>
                  </div>
                  {usersResponse.meta.total_pages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={
                                usersResponse.meta.has_prev_page
                                  ? () =>
                                      onPageChange(
                                        Number(
                                          usersResponse.meta.current_page
                                        ) - 1
                                      )
                                  : undefined
                              }
                              className={
                                usersResponse.meta.has_prev_page
                                  ? "cursor-pointer hover:bg-accent"
                                  : "cursor-not-allowed opacity-50 pointer-events-none"
                              }
                            />
                          </PaginationItem>

                          {/* Page Numbers */}
                          {Array.from(
                            { length: usersResponse.meta.total_pages },
                            (_, i) => i + 1
                          )
                            .filter((pageNum) => {
                              const current = usersResponse.meta.current_page;
                              return (
                                pageNum === 1 ||
                                pageNum === usersResponse.meta.total_pages ||
                                (pageNum >= current - 1 &&
                                  pageNum <= current + 1)
                              );
                            })
                            .map((pageNum, index, array) => (
                              <React.Fragment key={pageNum}>
                                {index > 0 &&
                                  array[index - 1] !== pageNum - 1 && (
                                    <PaginationItem>
                                      <span className="px-3 py-2 text-muted-foreground">
                                        ...
                                      </span>
                                    </PaginationItem>
                                  )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => onPageChange(pageNum)}
                                    isActive={
                                      pageNum ===
                                      usersResponse.meta.current_page
                                    }
                                    className="cursor-pointer hover:bg-accent"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            ))}

                          <PaginationItem>
                            <PaginationNext
                              onClick={
                                usersResponse.meta.has_next_page
                                  ? () =>
                                      onPageChange(
                                        Number(
                                          usersResponse.meta.current_page
                                        ) + 1
                                      )
                                  : undefined
                              }
                              className={
                                usersResponse.meta.has_next_page
                                  ? "cursor-pointer hover:bg-accent"
                                  : "cursor-not-allowed opacity-50 pointer-events-none"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Detail Drawer */}
      {/* <UserDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={handleCloseDetailDrawer}
        userId={selectedUserId}
        userName={selectedUserName}
      /> */}
    </>
  );
}
