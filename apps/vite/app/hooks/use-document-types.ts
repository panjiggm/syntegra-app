import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";

// Document Type interfaces
export interface DocumentType {
  id: string;
  key: string;
  name: string;
  weight: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentTypeRequest {
  key: string;
  name: string;
  weight?: number;
}

export interface UpdateDocumentTypeRequest {
  key?: string;
  name?: string;
  weight?: number;
}

export interface GetDocumentTypesRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: "key" | "name" | "weight" | "created_at" | "updated_at";
  sort_order?: "asc" | "desc";
  created_from?: string;
  created_to?: string;
}

export interface GetDocumentTypesResponse {
  success: boolean;
  message: string;
  data: DocumentType[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  timestamp: string;
}

export interface CreateDocumentTypeResponse {
  success: boolean;
  message: string;
  data: DocumentType;
  timestamp: string;
}

export interface UpdateDocumentTypeResponse {
  success: boolean;
  message: string;
  data: DocumentType;
  timestamp: string;
}

export interface DeleteDocumentTypeResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    key: string;
    name: string;
    deleted_at: string;
  };
  timestamp: string;
}

// Add document types to query keys
declare module "~/lib/query-client" {
  interface QueryKeys {
    documentTypes: {
      all: readonly ["document-types"];
      lists: () => readonly ["document-types", "list"];
      list: (filters?: GetDocumentTypesRequest) => readonly ["document-types", "list", GetDocumentTypesRequest | undefined];
      details: () => readonly ["document-types", "detail"];
      detail: (id: string) => readonly ["document-types", "detail", string];
    };
  }
}

// Extend queryKeys with document types
const documentTypesQueryKeys = {
  all: ["document-types"] as const,
  lists: () => [...documentTypesQueryKeys.all, "list"] as const,
  list: (filters?: GetDocumentTypesRequest) => [...documentTypesQueryKeys.lists(), filters] as const,
  details: () => [...documentTypesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...documentTypesQueryKeys.details(), id] as const,
};

export function useDocumentTypes() {
  const queryClient = useQueryClient();

  // Get all document types with filters (Query) - Available for both admin and participant
  const useGetDocumentTypes = (params?: GetDocumentTypesRequest) => {
    return useQuery({
      queryKey: documentTypesQueryKeys.list(params),
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
        if (params?.sort_order) queryParams.set("sort_order", params.sort_order);
        if (params?.created_from) queryParams.set("created_from", params.created_from);
        if (params?.created_to) queryParams.set("created_to", params.created_to);

        const response = await apiClient.get<GetDocumentTypesResponse>(
          `/documents/types?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch document types");
        }

        return response;
      },
      enabled: true,
    });
  };

  // Get document type by ID (Query)
  const useGetDocumentTypeById = (typeId: string) => {
    return useQuery({
      queryKey: documentTypesQueryKeys.detail(typeId),
      queryFn: async () => {
        const response = await apiClient.get(`/documents/types/${typeId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to get document type");
        }
        return response.data;
      },
      enabled: !!typeId,
    });
  };

  // Create document type (Mutation) - Admin only
  const useCreateDocumentType = () => {
    return useMutation({
      mutationFn: async (data: CreateDocumentTypeRequest) => {
        const response = await apiClient.post<CreateDocumentTypeResponse>(
          "/documents/types",
          data
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create document type");
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch document types list
        queryClient.invalidateQueries({ queryKey: documentTypesQueryKeys.lists() });

        // Show success toast
        toast.success("Tipe dokumen berhasil dibuat!", {
          description: `Tipe dokumen "${data.data.name}" telah ditambahkan`,
        });
      },
      onError: (error: any) => {
        // Parse error response to get field-specific errors
        let errorResponse = error;

        // Check if we have structured errors array
        if (
          errorResponse?.response?.data?.errors &&
          Array.isArray(errorResponse?.response?.data?.errors)
        ) {
          const fieldErrors = errorResponse?.response?.data?.errors;

          // Show specific field errors
          fieldErrors.forEach((fieldError: any) => {
            if (fieldError.field === "key") {
              toast.error("Key sudah digunakan", {
                description: "Silakan gunakan key yang berbeda",
              });
            } else if (fieldError.field === "name") {
              toast.error("Error pada nama tipe dokumen", {
                description: fieldError.message,
              });
            } else if (fieldError.field === "weight") {
              toast.error("Error pada bobot", {
                description: fieldError.message,
              });
            } else {
              toast.error(`Error pada field ${fieldError.field}`, {
                description: fieldError.message,
              });
            }
          });
        } else {
          // Fallback to original error message parsing
          const errorMessage = (
            errorResponse?.response?.data?.message || 
            errorResponse.message || 
            error.message
          ).toLowerCase();

          if (errorMessage.includes("unique") || errorMessage.includes("key")) {
            toast.error("Key sudah digunakan", {
              description: "Silakan gunakan key yang berbeda",
            });
          } else if (errorMessage.includes("admin")) {
            toast.error("Akses ditolak", {
              description: "Hanya admin yang dapat membuat tipe dokumen",
            });
          } else {
            toast.error("Gagal membuat tipe dokumen", {
              description: errorResponse?.response?.data?.message || errorResponse.message || error.message,
            });
          }
        }
      },
    });
  };

  // Update document type (Mutation) - Admin only
  const useUpdateDocumentType = () => {
    return useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: UpdateDocumentTypeRequest;
      }) => {
        const response = await apiClient.put<UpdateDocumentTypeResponse>(
          `/documents/types/${id}`,
          data
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to update document type");
        }
        return response;
      },
      onSuccess: (data, variables) => {
        // Invalidate specific document type and document types list
        queryClient.invalidateQueries({
          queryKey: documentTypesQueryKeys.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: documentTypesQueryKeys.lists() });

        toast.success("Tipe dokumen berhasil diupdate!", {
          description: `Tipe dokumen "${data.data.name}" telah diperbarui`,
        });
      },
      onError: (error: any) => {
        // Parse error response to get field-specific errors
        let errorResponse = error;

        // Check if we have structured errors array
        if (
          errorResponse?.response?.data?.errors &&
          Array.isArray(errorResponse?.response?.data?.errors)
        ) {
          const fieldErrors = errorResponse?.response?.data?.errors;

          // Show specific field errors
          fieldErrors.forEach((fieldError: any) => {
            if (fieldError.field === "key") {
              toast.error("Key sudah digunakan", {
                description: "Silakan gunakan key yang berbeda",
              });
            } else if (fieldError.field === "name") {
              toast.error("Error pada nama tipe dokumen", {
                description: fieldError.message,
              });
            } else if (fieldError.field === "weight") {
              toast.error("Error pada bobot", {
                description: fieldError.message,
              });
            } else {
              toast.error(`Error pada field ${fieldError.field}`, {
                description: fieldError.message,
              });
            }
          });
        } else {
          // Fallback to original error message parsing
          const errorMessage = (
            errorResponse?.response?.data?.message || 
            errorResponse.message || 
            error.message
          ).toLowerCase();

          if (errorMessage.includes("unique") || errorMessage.includes("key")) {
            toast.error("Key sudah digunakan", {
              description: "Silakan gunakan key yang berbeda",
            });
          } else if (errorMessage.includes("not found")) {
            toast.error("Tipe dokumen tidak ditemukan", {
              description: "Tipe dokumen yang akan diupdate tidak ditemukan",
            });
          } else if (errorMessage.includes("admin")) {
            toast.error("Akses ditolak", {
              description: "Hanya admin yang dapat mengupdate tipe dokumen",
            });
          } else {
            toast.error("Gagal mengupdate tipe dokumen", {
              description: errorResponse?.response?.data?.message || errorResponse.message || error.message,
            });
          }
        }
      },
    });
  };

  // Delete document type (Mutation) - Admin only
  const useDeleteDocumentType = () => {
    return useMutation({
      mutationFn: async (typeId: string) => {
        const response = await apiClient.delete<DeleteDocumentTypeResponse>(
          `/documents/types/${typeId}`
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to delete document type");
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate document types list
        queryClient.invalidateQueries({ queryKey: documentTypesQueryKeys.lists() });

        toast.success("Tipe dokumen berhasil dihapus", {
          description: `Tipe dokumen "${data.data.name}" telah dihapus`,
        });
      },
      onError: (error: any) => {
        const errorResponse = error?.response?.data || error;
        const errorMessage = (
          errorResponse.message || 
          error.message
        ).toLowerCase();

        if (errorMessage.includes("in use") || errorMessage.includes("referenced")) {
          toast.error("Tidak dapat menghapus tipe dokumen", {
            description: "Tipe dokumen sedang digunakan oleh dokumen administrasi",
          });
        } else if (errorMessage.includes("not found")) {
          toast.error("Tipe dokumen tidak ditemukan", {
            description: "Tipe dokumen yang akan dihapus tidak ditemukan",
          });
        } else if (errorMessage.includes("admin")) {
          toast.error("Akses ditolak", {
            description: "Hanya admin yang dapat menghapus tipe dokumen",
          });
        } else {
          toast.error("Gagal menghapus tipe dokumen", {
            description: errorResponse.message || error.message,
          });
        }
      },
    });
  };

  return {
    // Queries - Available for both admin and participant
    useGetDocumentTypes,
    useGetDocumentTypeById,

    // Mutations - Admin only
    useCreateDocumentType,
    useUpdateDocumentType,
    useDeleteDocumentType,
  };
}