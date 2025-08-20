import React, { useState, useCallback, useEffect } from "react";
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
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Progress } from "~/components/ui/progress";
import {
  RefreshCw,
  MoreHorizontal,
  Eye,
  Upload,
  FileText,
  Users,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAdministrationDocuments } from "~/hooks/use-administration-documents";
import type {
  AdministrationListItem,
  GetAdministrationListRequest,
} from "~/hooks/use-administration-documents";

export function ParticipantAdministration() {
  const {
    useGetAdministrationList,
    calculateCompletionPercentage,
    getStatusVariant,
    getUploadStatusText,
    getStatusFilterOptions,
    getSortOptions,
  } = useAdministrationDocuments();

  // State for filters and pagination
  const [params, setParams] = useState<GetAdministrationListRequest>({
    page: 1,
    limit: 10,
    search: "",
    sort_by: "name",
    sort_order: "asc",
    status: undefined,
  });

  const [selectedParticipant, setSelectedParticipant] =
    useState<AdministrationListItem | null>(null);

  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({
        ...prev,
        search: searchInput,
        page: 1, // Reset to first page when searching
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: administrationData,
    isLoading,
    error,
    refetch,
  } = useGetAdministrationList(params);

  // Helper function to format phone number
  const formatPhone = (phone: string | null): string => {
    if (!phone) return "-";
    return phone.startsWith("08") ? phone : `+62${phone.substring(1)}`;
  };

  // Helper function to get completion status
  const getCompletionStatus = (item: AdministrationListItem) => {
    const summary = {
      total_document_types: item.total_document_types,
      uploaded_count: item.document_count,
      pending_count: item.total_document_types - item.document_count,
    };

    const percentage = calculateCompletionPercentage(summary);
    const variant = getStatusVariant(percentage);
    const statusText = getUploadStatusText(summary);

    return { percentage, variant, statusText, summary };
  };

  // Handler functions
  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    const filterValue =
      status === "all"
        ? undefined
        : (status as GetAdministrationListRequest["status"]);
    setParams((prev) => ({ ...prev, status: filterValue, page: 1 }));
  }, []);

  const handleSort = useCallback(
    (sortBy: GetAdministrationListRequest["sort_by"]) => {
      setParams((prev) => ({
        ...prev,
        sort_by: sortBy,
        sort_order:
          prev.sort_by === sortBy && prev.sort_order === "asc" ? "desc" : "asc",
        page: 1,
      }));
    },
    []
  );

  // Handle view documents for a participant
  const handleViewDocuments = (participant: AdministrationListItem) => {
    setSelectedParticipant(participant);
    // TODO: Open modal or navigate to detail page
    console.log("View documents for:", participant);
  };

  // Get sort icon based on current sort state
  const getSortIcon = (column: string) => {
    if (params.sort_by !== column)
      return <ArrowUpDown className="size-3 text-muted-foreground" />;
    return params.sort_order === "asc" ? (
      <ArrowUp className="size-3 text-primary" />
    ) : (
      <ArrowDown className="size-3 text-primary" />
    );
  };

  // Calculate pagination range
  const paginationRange = () => {
    if (!administrationData?.meta) return [];

    const { current_page, total_pages } = administrationData.meta;
    const range = [];
    const showRange = 2;

    for (
      let i = Math.max(1, current_page - showRange);
      i <= Math.min(total_pages, current_page + showRange);
      i++
    ) {
      range.push(i);
    }

    return range;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Administrasi Peserta</h2>
            <p className="text-muted-foreground text-sm">
              Kelola dokumen administrasi peserta
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau nomor telepon peserta..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={params.status || "all"}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  {getStatusFilterOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page Size */}
              <Select
                value={params.limit?.toString() || "10"}
                onValueChange={(value) => handlePageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="default"
              >
                <RefreshCw
                  className={`size-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Peserta & Status Dokumen</CardTitle>
                {administrationData?.meta && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Menampilkan{" "}
                    {(administrationData.meta.current_page - 1) *
                      administrationData.meta.per_page +
                      1}{" "}
                    -{" "}
                    {Math.min(
                      administrationData.meta.current_page *
                        administrationData.meta.per_page,
                      administrationData.meta.total
                    )}{" "}
                    dari {administrationData.meta.total} peserta
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-red-600 mb-2">
                  Gagal memuat data administrasi
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {error.message}
                </p>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  <RefreshCw className="size-4 mr-2" />
                  Coba Lagi
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("name")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            Peserta
                            {getSortIcon("name")}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("phone")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            Kontak
                            {getSortIcon("phone")}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("document_count")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            Dokumen
                            {getSortIcon("document_count")}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <LoadingSpinner size="lg" />
                        </TableCell>
                      </TableRow>
                    ) : administrationData?.data &&
                      administrationData.data.length > 0 ? (
                      administrationData.data.map((participant, index) => {
                        const { percentage, variant, statusText } =
                          getCompletionStatus(participant);

                        // Calculate actual row number based on pagination
                        const rowNumber =
                          ((administrationData.meta?.current_page || 1) - 1) *
                            (administrationData.meta?.per_page || 10) +
                          index +
                          1;

                        return (
                          <TableRow key={participant.id}>
                            <TableCell className="text-gray-500">
                              {rowNumber}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {participant.name}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="size-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {formatPhone(participant.phone)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">
                                  {participant.document_count}/
                                  {participant.total_document_types}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  dokumen
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={percentage} className="h-2" />
                                <div className="text-xs text-muted-foreground">
                                  {percentage}%
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant={variant}>{statusText}</Badge>
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
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleViewDocuments(participant)
                                    }
                                  >
                                    <Eye className="size-4 mr-2" />
                                    Lihat Dokumen
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Upload className="size-4 mr-2" />
                                    Upload Dokumen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="text-center">
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <div className="text-muted-foreground">
                              {searchInput || params.status
                                ? "Tidak ada peserta yang sesuai dengan pencarian"
                                : "Tidak ada data peserta ditemukan"}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {administrationData?.meta && administrationData.meta.total > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Menampilkan{" "}
                  {(administrationData.meta.current_page - 1) *
                    administrationData.meta.per_page +
                    1}{" "}
                  -{" "}
                  {Math.min(
                    administrationData.meta.current_page *
                      administrationData.meta.per_page,
                    administrationData.meta.total
                  )}{" "}
                  dari {administrationData.meta.total} peserta
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(administrationData.meta.current_page - 1)
                    }
                    disabled={!administrationData.meta.has_prev_page}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    {administrationData.meta.current_page > 3 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </Button>
                        {administrationData.meta.current_page > 4 && (
                          <span className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )}
                      </>
                    )}

                    {/* Page range */}
                    {paginationRange().map((page) => (
                      <Button
                        key={page}
                        variant={
                          page === administrationData.meta.current_page
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}

                    {/* Last page */}
                    {administrationData.meta.current_page <
                      administrationData.meta.total_pages - 2 && (
                      <>
                        {administrationData.meta.current_page <
                          administrationData.meta.total_pages - 3 && (
                          <span className="px-2 text-muted-foreground">
                            ...
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePageChange(
                              administrationData.meta.total_pages
                            )
                          }
                        >
                          {administrationData.meta.total_pages}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Next Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePageChange(administrationData.meta.current_page + 1)
                    }
                    disabled={!administrationData.meta.has_next_page}
                  >
                    Next
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
