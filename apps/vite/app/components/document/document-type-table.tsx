import React from "react";
import { Search, Edit, Trash2, FileType } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  type DocumentType,
  type GetDocumentTypesRequest,
} from "~/hooks/use-document-types";

interface DocumentTypeTableProps {
  documentTypes: DocumentType[];
  isLoading: boolean;
  totalWeight: number;
  currentPage: number;
  sortBy: GetDocumentTypesRequest["sort_by"];
  sortOrder: GetDocumentTypesRequest["sort_order"];
  onSort: (column: GetDocumentTypesRequest["sort_by"]) => void;
  onEdit: (documentType: DocumentType) => void;
  onDelete: (documentType: DocumentType) => void;
  meta?: {
    total: number;
    total_pages: number;
    has_prev_page: boolean;
    has_next_page: boolean;
  };
  onPageChange: (page: number) => void;
}

export function DocumentTypeTable({
  documentTypes,
  isLoading,
  totalWeight,
  currentPage,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  meta,
  onPageChange,
}: DocumentTypeTableProps) {
  const formatDate = (dateString: Date | string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("name")}
              >
                Tipe Dokumen{" "}
                {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("weight")}
              >
                Bobot {sortBy === "weight" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("created_at")}
              >
                Dibuat{" "}
                {sortBy === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : documentTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <FileType className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-500">Belum ada tipe dokumen</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {documentTypes.map((documentType, index) => (
                  <TableRow key={documentType.id}>
                    <TableCell className="text-gray-500">
                      {(currentPage - 1) * 10 + index + 1}
                    </TableCell>
                    <TableCell>{documentType.name}</TableCell>
                    <TableCell>{documentType.weight}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(documentType.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(documentType)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(documentType)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total Weight Row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell></TableCell>
                  <TableCell>Total Bobot</TableCell>
                  <TableCell
                    className={
                      totalWeight === 100
                        ? "text-green-600"
                        : totalWeight > 100
                          ? "text-red-600"
                          : ""
                    }
                  >
                    <strong>{totalWeight}</strong>/100
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan {(currentPage - 1) * 10 + 1} -{" "}
            {Math.min(currentPage * 10, meta.total)} dari {meta.total} data
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!meta.has_prev_page}
            >
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {currentPage} dari {meta.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!meta.has_next_page}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
