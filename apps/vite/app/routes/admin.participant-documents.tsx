import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Edit, Trash2, FileType } from "lucide-react";
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
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  useDocumentTypes,
  type DocumentType,
  type CreateDocumentTypeRequest,
  type UpdateDocumentTypeRequest,
  type GetDocumentTypesRequest,
} from "~/hooks/use-document-types";

const documentTypeSchema = z.object({
  key: z
    .string()
    .min(1, "Key harus diisi")
    .max(100, "Key maksimal 100 karakter")
    .regex(/^[a-z0-9_-]+$/, "Key hanya boleh berisi huruf kecil, angka, underscore, dan dash"),
  name: z
    .string()
    .min(1, "Nama harus diisi")
    .max(255, "Nama maksimal 255 karakter"),
  weight: z
    .number()
    .min(0, "Bobot minimal 0")
    .max(100, "Bobot maksimal 100")
    .optional(),
  max_score: z
    .number()
    .min(0, "Skor maksimal minimal 0")
    .optional(),
});

type DocumentTypeFormData = z.infer<typeof documentTypeSchema>;

export default function ParticipantDocumentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocumentType, setDeletingDocumentType] = useState<DocumentType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<GetDocumentTypesRequest["sort_by"]>("created_at");
  const [sortOrder, setSortOrder] = useState<GetDocumentTypesRequest["sort_order"]>("desc");

  const {
    useGetDocumentTypes,
    useCreateDocumentType,
    useUpdateDocumentType,
    useDeleteDocumentType,
  } = useDocumentTypes();

  const queryParams: GetDocumentTypesRequest = {
    page: currentPage,
    limit: 10,
    search: searchQuery || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  };

  const { data: documentTypesResponse, isLoading } = useGetDocumentTypes(queryParams);
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const createForm = useForm<DocumentTypeFormData>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: {
      key: "",
      name: "",
      weight: 1,
      max_score: undefined,
    },
  });

  const editForm = useForm<DocumentTypeFormData>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: {
      key: "",
      name: "",
      weight: 1,
      max_score: undefined,
    },
  });

  const handleCreateSubmit = async (data: DocumentTypeFormData) => {
    try {
      const payload: CreateDocumentTypeRequest = {
        key: data.key,
        name: data.name,
        weight: data.weight,
        max_score: data.max_score,
      };

      await createMutation.mutateAsync(payload);
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error) {
      console.error("Error creating document type:", error);
    }
  };

  const handleEditSubmit = async (data: DocumentTypeFormData) => {
    if (!editingDocumentType) return;

    try {
      const payload: UpdateDocumentTypeRequest = {
        key: data.key,
        name: data.name,
        weight: data.weight,
        max_score: data.max_score,
      };

      await updateMutation.mutateAsync({
        id: editingDocumentType.id,
        data: payload,
      });
      setIsEditDialogOpen(false);
      setEditingDocumentType(null);
      editForm.reset();
    } catch (error) {
      console.error("Error updating document type:", error);
    }
  };

  const handleEdit = (documentType: DocumentType) => {
    setEditingDocumentType(documentType);
    editForm.reset({
      key: documentType.key,
      name: documentType.name,
      weight: parseFloat(documentType.weight),
      max_score: documentType.max_score ? parseFloat(documentType.max_score) : undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDocumentType) return;

    try {
      await deleteMutation.mutateAsync(deletingDocumentType.id);
      setDeleteDialogOpen(false);
      setDeletingDocumentType(null);
    } catch (error) {
      console.error("Error deleting document type:", error);
    }
  };

  const handleSort = (column: GetDocumentTypesRequest["sort_by"]) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const formatDate = (dateString: Date | string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const documentTypes = documentTypesResponse?.data || [];
  const meta = documentTypesResponse?.meta;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipe Dokumen Administrasi</h1>
          <p className="text-muted-foreground">
            Kelola tipe dokumen untuk administrasi peserta
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tipe Dokumen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Tipe Dokumen</DialogTitle>
              <DialogDescription>
                Buat tipe dokumen baru untuk administrasi peserta
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="create-key">Key</Label>
                <Input
                  id="create-key"
                  placeholder="cv, ijazah, ktp"
                  {...createForm.register("key")}
                />
                {createForm.formState.errors.key && (
                  <p className="text-sm text-red-500 mt-1">
                    {createForm.formState.errors.key.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="create-name">Nama</Label>
                <Input
                  id="create-name"
                  placeholder="Curriculum Vitae"
                  {...createForm.register("name")}
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="create-weight">Bobot</Label>
                <Input
                  id="create-weight"
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  {...createForm.register("weight", { valueAsNumber: true })}
                />
                {createForm.formState.errors.weight && (
                  <p className="text-sm text-red-500 mt-1">
                    {createForm.formState.errors.weight.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="create-max-score">Skor Maksimal</Label>
                <Input
                  id="create-max-score"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  {...createForm.register("max_score", { valueAsNumber: true })}
                />
                {createForm.formState.errors.max_score && (
                  <p className="text-sm text-red-500 mt-1">
                    {createForm.formState.errors.max_score.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Cari tipe dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("key")}
              >
                Key {sortBy === "key" && (sortOrder === "asc" ? "‘" : "“")}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("name")}
              >
                Nama {sortBy === "name" && (sortOrder === "asc" ? "‘" : "“")}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("weight")}
              >
                Bobot {sortBy === "weight" && (sortOrder === "asc" ? "‘" : "“")}
              </TableHead>
              <TableHead>Skor Maksimal</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort("created_at")}
              >
                Dibuat {sortBy === "created_at" && (sortOrder === "asc" ? "‘" : "“")}
              </TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : documentTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <FileType className="w-8 h-8 text-gray-400" />
                    <p className="text-gray-500">Belum ada tipe dokumen</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              documentTypes.map((documentType, index) => (
                <TableRow key={documentType.id}>
                  <TableCell className="text-gray-500">
                    {((currentPage - 1) * 10) + index + 1}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {documentType.key}
                  </TableCell>
                  <TableCell>{documentType.name}</TableCell>
                  <TableCell>{documentType.weight}</TableCell>
                  <TableCell>
                    {documentType.max_score || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(documentType.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(documentType)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingDocumentType(documentType);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Menampilkan {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, meta.total)} dari {meta.total} data
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
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
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!meta.has_next_page}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tipe Dokumen</DialogTitle>
            <DialogDescription>
              Ubah informasi tipe dokumen
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-key">Key</Label>
              <Input
                id="edit-key"
                placeholder="cv, ijazah, ktp"
                {...editForm.register("key")}
              />
              {editForm.formState.errors.key && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.key.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-name">Nama</Label>
              <Input
                id="edit-name"
                placeholder="Curriculum Vitae"
                {...editForm.register("name")}
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-weight">Bobot</Label>
              <Input
                id="edit-weight"
                type="number"
                step="0.01"
                placeholder="1.00"
                {...editForm.register("weight", { valueAsNumber: true })}
              />
              {editForm.formState.errors.weight && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.weight.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-max-score">Skor Maksimal</Label>
              <Input
                id="edit-max-score"
                type="number"
                step="0.01"
                placeholder="100.00"
                {...editForm.register("max_score", { valueAsNumber: true })}
              />
              {editForm.formState.errors.max_score && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.max_score.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Tipe Dokumen</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus tipe dokumen "{deletingDocumentType?.name}"?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}