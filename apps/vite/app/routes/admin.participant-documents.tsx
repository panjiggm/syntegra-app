import { useState, useMemo } from "react";
import { Plus, FileType, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  useDocumentTypes,
  type DocumentType,
  type CreateDocumentTypeRequest,
  type UpdateDocumentTypeRequest,
  type GetDocumentTypesRequest,
} from "~/hooks/use-document-types";
import { DocumentTypeTable } from "~/components/document/document-type-table";
import { ParticipantAdministration } from "~/components/document/participant-administration";
import { DocumentTypeForm } from "~/components/document/document-type-form";
import { DeleteConfirmationDialog } from "~/components/document/delete-confirmation-dialog";

// Helper function to calculate total weight
const calculateTotalWeight = (
  documentTypes: DocumentType[],
  excludeId?: string
): number => {
  return documentTypes
    .filter((docType) => docType.id !== excludeId)
    .reduce((total, docType) => total + parseFloat(docType.weight || "0"), 0);
};

export default function ParticipantDocumentPage() {
  const [activeTab, setActiveTab] = useState("document-types");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] =
    useState<DocumentType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocumentType, setDeletingDocumentType] =
    useState<DocumentType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<GetDocumentTypesRequest["sort_by"]>("created_at");
  const [sortOrder, setSortOrder] =
    useState<GetDocumentTypesRequest["sort_order"]>("desc");

  const {
    useGetDocumentTypes,
    useCreateDocumentType,
    useUpdateDocumentType,
    useDeleteDocumentType,
  } = useDocumentTypes();

  const queryParams: GetDocumentTypesRequest = {
    page: currentPage,
    limit: 10,
    sort_by: sortBy,
    sort_order: sortOrder,
  };

  const { data: documentTypesResponse, isLoading } =
    useGetDocumentTypes(queryParams);
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const handleCreateSubmit = async (data: CreateDocumentTypeRequest) => {
    await createMutation.mutateAsync(data);
  };

  const handleEditSubmit = async (data: {
    id: string;
    data: UpdateDocumentTypeRequest;
  }) => {
    await updateMutation.mutateAsync(data);
  };

  const handleEdit = (documentType: DocumentType) => {
    setEditingDocumentType(documentType);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (documentType: DocumentType) => {
    setDeletingDocumentType(documentType);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDocumentType) return;
    await deleteMutation.mutateAsync(deletingDocumentType.id);
    setDeleteDialogOpen(false);
    setDeletingDocumentType(null);
  };

  const handleSort = (column: GetDocumentTypesRequest["sort_by"]) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const documentTypes = documentTypesResponse?.data || [];
  const meta = documentTypesResponse?.meta;

  // Calculate total weight and remaining weight for validation
  const totalWeight = useMemo(
    () => calculateTotalWeight(documentTypes),
    [documentTypes]
  );
  const remainingWeightForCreate = useMemo(
    () => Math.max(0, 100 - totalWeight),
    [totalWeight]
  );
  const remainingWeightForEdit = useMemo(() => {
    if (!editingDocumentType) return 0;
    const totalWithoutCurrent = calculateTotalWeight(
      documentTypes,
      editingDocumentType.id
    );
    return Math.max(0, 100 - totalWithoutCurrent);
  }, [documentTypes, editingDocumentType]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administrasi Peserta</h1>
          <p className="text-muted-foreground">
            Kelola tipe dokumen dan administrasi peserta
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="document-types" className="px-6">
            <FileType className="w-4 h-4 mr-2" />
            Tipe Dokumen
          </TabsTrigger>
          <TabsTrigger value="participant-administration" className="px-6">
            <Users className="w-4 h-4 mr-2" />
            Administrasi Peserta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="document-types" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tipe Dokumen</h2>
              <p className="text-muted-foreground text-sm">
                Kelola tipe dokumen untuk administrasi peserta
              </p>
            </div>
            <Button
              disabled={totalWeight >= 100}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {totalWeight >= 100
                ? "Total Bobot Sudah Penuh"
                : "Tambah Tipe Dokumen"}
            </Button>
          </div>

          <DocumentTypeTable
            documentTypes={documentTypes}
            isLoading={isLoading}
            totalWeight={totalWeight}
            currentPage={currentPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            meta={meta}
            onPageChange={setCurrentPage}
          />
        </TabsContent>

        <TabsContent value="participant-administration">
          <ParticipantAdministration />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Dialog */}
      <DocumentTypeForm
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
        totalWeight={totalWeight}
        remainingWeight={remainingWeightForCreate}
      />

      {editingDocumentType && (
        <DocumentTypeForm
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          mode="edit"
          documentType={editingDocumentType}
          onSubmit={handleEditSubmit}
          isPending={updateMutation.isPending}
          totalWeight={totalWeight}
          remainingWeight={remainingWeightForEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        documentType={deletingDocumentType}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
