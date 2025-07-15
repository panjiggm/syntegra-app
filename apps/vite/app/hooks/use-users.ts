import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;

// Helper function to generate PDF
const generatePDF = async (exportData: any, filename: string) => {
  try {
    console.log("Starting PDF generation with data:", exportData);

    const { default: UsersBulkExportPDF } = await import(
      "~/components/admin/users/pdf/UsersBulkExportPDF"
    );
    const React = await import("react");

    // Validate data structure
    if (!exportData || !exportData.users || !Array.isArray(exportData.users)) {
      throw new Error("Invalid export data structure: missing users array");
    }

    if (!exportData.metadata) {
      throw new Error("Invalid export data structure: missing metadata");
    }

    console.log("Data validation passed, creating PDF component...");

    // UsersBulkExportPDF sudah return <Document>, jadi perlu wrap jika belum <Document>
    const { Document } = await import("@react-pdf/renderer");
    const pdfComponent = React.createElement(
      Document,
      null,
      React.createElement(UsersBulkExportPDF, {
        data: exportData,
      })
    );

    console.log("PDF component created, generating blob...");
    const blob = await pdf(pdfComponent).toBlob();

    console.log("PDF blob generated successfully, saving file...");
    saveAs(blob, filename);

    console.log("PDF file saved successfully");
  } catch (error) {
    console.error("Error in generatePDF:", error);
    throw error;
  }
};

// Helper function to generate Excel
const generateExcel = async (exportData: any, filename: string) => {
  const { users, metadata } = exportData;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ["LAPORAN EXPORT DATA USERS"],
    [""],
    ["Tanggal Export", metadata.export_date],
    ["Total Users", metadata.total_users],
    ["Include Details", metadata.include_details ? "Ya" : "Tidak"],
    [""],
    ["STATISTIK"],
    ["Total Users", users.length],
    ["Users Aktif", users.filter((u: any) => u.is_active).length],
    ["Email Terverifikasi", users.filter((u: any) => u.email_verified).length],
    ["Admin", users.filter((u: any) => u.role === "admin").length],
    ["Participant", users.filter((u: any) => u.role === "participant").length],
    [""],
    ["DISTRIBUSI GENDER"],
    ["Laki-laki", users.filter((u: any) => u.gender === "male").length],
    ["Perempuan", users.filter((u: any) => u.gender === "female").length],
    [
      "Lainnya",
      users.filter((u: any) => u.gender === "other" || !u.gender).length,
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

  // Users data sheet
  const usersData = [
    [
      "No",
      "NIK",
      "Nama",
      "Email",
      "Role",
      "Gender",
      "Telepon",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Agama",
      "Pendidikan",
      "Alamat",
      "Provinsi",
      "Kabupaten",
      "Kecamatan",
      "Kelurahan",
      "Kode Pos",
      "Status Aktif",
      "Email Terverifikasi",
      "Tanggal Dibuat",
      "Tanggal Update",
    ],
    ...users.map((user: any, index: number) => [
      index + 1,
      user.nik || "",
      user.name,
      user.email,
      user.role,
      user.gender === "male"
        ? "Laki-laki"
        : user.gender === "female"
          ? "Perempuan"
          : "Lainnya",
      user.phone || "",
      user.birth_place || "",
      user.birth_date
        ? new Date(user.birth_date).toLocaleDateString("id-ID")
        : "",
      user.religion || "",
      user.education || "",
      user.address || "",
      user.province || "",
      user.regency || "",
      user.district || "",
      user.village || "",
      user.postal_code || "",
      user.is_active ? "Aktif" : "Tidak Aktif",
      user.email_verified ? "Terverifikasi" : "Belum Terverifikasi",
      user.created_at
        ? new Date(user.created_at).toLocaleDateString("id-ID")
        : "",
      user.updated_at
        ? new Date(user.updated_at).toLocaleDateString("id-ID")
        : "",
    ]),
  ];

  const usersSheet = XLSX.utils.aoa_to_sheet(usersData);

  // Set column widths
  const colWidths = [
    { wch: 5 }, // No
    { wch: 20 }, // NIK
    { wch: 25 }, // Nama
    { wch: 30 }, // Email
    { wch: 12 }, // Role
    { wch: 12 }, // Gender
    { wch: 15 }, // Telepon
    { wch: 20 }, // Tempat Lahir
    { wch: 15 }, // Tanggal Lahir
    { wch: 15 }, // Agama
    { wch: 15 }, // Pendidikan
    { wch: 30 }, // Alamat
    { wch: 20 }, // Provinsi
    { wch: 20 }, // Kabupaten
    { wch: 20 }, // Kecamatan
    { wch: 20 }, // Kelurahan
    { wch: 10 }, // Kode Pos
    { wch: 15 }, // Status Aktif
    { wch: 18 }, // Email Terverifikasi
    { wch: 15 }, // Tanggal Dibuat
    { wch: 15 }, // Tanggal Update
  ];
  usersSheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(workbook, usersSheet, "Data Users");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
};

// Define types locally for now (to be replaced with shared-types later)
interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "participant";
  nik?: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  birth_place?: string;
  birth_date?: string;
  religion?: string;
  education?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
  postal_code?: string;
}

interface User {
  id: string;
  nik: string | null;
  name: string;
  role: string;
  email: string;
  gender: string | null;
  phone: string | null;
  birth_place: string | null;
  birth_date: Date | null;
  religion: string | null;
  education: string | null;
  address: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  postal_code: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: Date;
  updated_by: Date;
}

interface CreateUserResponse {
  success: boolean;
  message: string;
  data?: User;
  timestamp: string;
}

// Additional types for better API integration
interface GetUsersRequest {
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "participant";
  gender?: "male" | "female" | "other";
  religion?: string;
  education?: string;
  province?: string;
  regency?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  created_from?: string;
  created_to?: string;
}

export interface GetUsersResponse {
  success: boolean;
  message: string;
  data: User[];
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

export function useUsers() {
  const queryClient = useQueryClient();

  // Get all users with filters (Query)
  const useGetUsers = (params?: GetUsersRequest) => {
    return useQuery({
      queryKey: queryKeys.users.list(params),
      queryFn: async () => {
        const queryParams = new URLSearchParams();

        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.role) queryParams.set("role", params.role);
        if (params?.gender) queryParams.set("gender", params.gender);
        if (params?.religion) queryParams.set("religion", params.religion);
        if (params?.education) queryParams.set("education", params.education);
        if (params?.province) queryParams.set("province", params.province);
        if (params?.regency) queryParams.set("regency", params.regency);
        if (params?.is_active !== undefined)
          queryParams.set("is_active", params.is_active.toString());
        if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
        if (params?.sort_order)
          queryParams.set("sort_order", params.sort_order);
        if (params?.created_from)
          queryParams.set("created_from", params.created_from);
        if (params?.created_to)
          queryParams.set("created_to", params.created_to);

        const response = await apiClient.get<GetUsersResponse>(
          `/users?${queryParams.toString()}`
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch users");
        }

        return response;
      },
      enabled: true,
    });
  };

  // Get user by ID (Query)
  const useGetUserById = (userId: string) => {
    return useQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: async () => {
        const response = await apiClient.get(`/users/${userId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to get user");
        }
        return response.data;
      },
      enabled: !!userId,
    });
  };

  // Create admin (Mutation)
  const useCreateAdmin = () => {
    return useMutation({
      mutationFn: async (data: Omit<CreateUserRequest, "role">) => {
        const adminData: CreateUserRequest = {
          ...data,
          role: "admin",
        };

        const response = await apiClient.post<CreateUserResponse>(
          "/users",
          adminData
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create admin");
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        // Show success toast
        toast.success("Admin berhasil dibuat!");
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
            if (fieldError.field === "email") {
              toast.error("Email sudah terdaftar", {
                description: "Silakan gunakan email yang berbeda",
              });
            } else if (fieldError.field === "nik") {
              toast.error("NIK sudah terdaftar", {
                description: "NIK yang dimasukkan telah digunakan",
              });
            } else if (fieldError.field === "phone") {
              toast.error("Nomor telepon sudah terdaftar", {
                description: "Silakan gunakan nomor telepon yang berbeda",
              });
            } else if (fieldError.field === "rate_limit") {
              toast.error("Batas pendaftaran terlampaui", {
                description:
                  "Terlalu banyak pendaftaran pengguna dari IP ini. Silakan coba lagi setelah 1 jam.",
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
            errorResponse.message || error.message
          ).toLowerCase();

          if (errorMessage.includes("email")) {
            toast.error("Email sudah terdaftar");
          } else if (errorMessage.includes("nik")) {
            toast.error("NIK sudah terdaftar");
          } else if (errorMessage.includes("phone")) {
            toast.error("Nomor telepon sudah terdaftar");
          } else {
            toast.error("Gagal mendaftarkan Admin", {
              description: errorResponse.message || error.message,
            });
          }
        }
      },
    });
  };

  // Create participant (Mutation)
  const useCreateParticipant = () => {
    return useMutation({
      mutationFn: async (data: Omit<CreateUserRequest, "role">) => {
        const participantData: CreateUserRequest = {
          ...data,
          role: "participant",
        };

        const response = await apiClient.post<CreateUserResponse>(
          "/users",
          participantData
        );
        if (!response.success) {
          throw new Error(response.message || "Failed to create participant");
        }
        return response;
      },
      onSuccess: () => {
        // Invalidate users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("Peserta berhasil didaftarkan!");
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
            if (fieldError.field === "email") {
              toast.error("Email sudah terdaftar", {
                description: "Silakan gunakan email yang berbeda",
              });
            } else if (fieldError.field === "nik") {
              toast.error("NIK sudah terdaftar", {
                description: "NIK yang dimasukkan telah digunakan",
              });
            } else if (fieldError.field === "phone") {
              toast.error("Nomor telepon sudah terdaftar", {
                description: "Silakan gunakan nomor telepon yang berbeda",
              });
            } else if (fieldError.field === "rate_limit") {
              toast.error("Batas pendaftaran terlampaui", {
                description:
                  "Terlalu banyak pendaftaran pengguna dari IP ini. Silakan coba lagi setelah 1 jam.",
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
            errorResponse.message || error.message
          ).toLowerCase();

          if (errorMessage.includes("email")) {
            toast.error("Email sudah terdaftar");
          } else if (errorMessage.includes("nik")) {
            toast.error("NIK sudah terdaftar");
          } else if (errorMessage.includes("phone")) {
            toast.error("Nomor telepon sudah terdaftar");
          } else {
            toast.error("Gagal mendaftarkan peserta", {
              description: errorResponse.message || error.message,
            });
          }
        }
      },
    });
  };

  // Update user (Mutation)
  const useUpdateUser = () => {
    return useMutation({
      mutationFn: async ({
        id,
        data,
      }: {
        id: string;
        data: Partial<CreateUserRequest>;
      }) => {
        const response = await apiClient.put(`/users/${id}`, data);
        if (!response.success) {
          throw new Error(response.message || "Failed to update user");
        }
        return response;
      },
      onSuccess: (_, variables) => {
        // Invalidate specific user and users list
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("User berhasil diupdate!");
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
            if (fieldError.field === "email") {
              toast.error("Email sudah terdaftar", {
                description: "Silakan gunakan email yang berbeda",
              });
            } else if (fieldError.field === "nik") {
              toast.error("NIK sudah terdaftar", {
                description: "NIK yang dimasukkan telah digunakan",
              });
            } else if (fieldError.field === "phone") {
              toast.error("Nomor telepon sudah terdaftar", {
                description: "Silakan gunakan nomor telepon yang berbeda",
              });
            } else if (fieldError.field === "rate_limit") {
              toast.error("Batas pendaftaran terlampaui", {
                description:
                  "Terlalu banyak pendaftaran pengguna dari IP ini. Silakan coba lagi setelah 1 jam.",
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
            errorResponse.message || error.message
          ).toLowerCase();

          if (errorMessage.includes("email")) {
            toast.error("Email sudah terdaftar");
          } else if (errorMessage.includes("nik")) {
            toast.error("NIK sudah terdaftar");
          } else if (errorMessage.includes("phone")) {
            toast.error("Nomor telepon sudah terdaftar");
          } else {
            toast.error("Gagal update user", {
              description: errorResponse.message || error.message,
            });
          }
        }
      },
    });
  };

  // Delete user (Mutation)
  const useDeleteUser = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        const response = await apiClient.delete(`/users/${userId}`);
        if (!response.success) {
          throw new Error(response.message || "Failed to delete user");
        }
        return response;
      },
      onSuccess: () => {
        // Invalidate users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("User berhasil dihapus");
      },
      onError: (error: Error) => {
        toast.error("Gagal menghapus user: " + error.message);
      },
    });
  };

  // Bulk CSV validation (Mutation)
  const useBulkValidateCSV = () => {
    return useMutation({
      mutationFn: async (data: {
        csv_content: string;
        file_name: string;
        column_mapping?: Record<string, string>;
        options?: {
          validate_only?: boolean;
          skip_duplicates?: boolean;
          default_role?: "admin" | "participant";
        };
      }) => {
        const response = await apiClient.post("/users/bulk/validate-csv", data);
        if (!response.success) {
          throw new Error(response.message || "Failed to validate CSV");
        }
        return response;
      },
      onError: (error: Error) => {
        console.error("CSV validation error:", error);
        toast.error("Gagal memvalidasi CSV", {
          description: error.message,
        });
      },
    });
  };

  // Bulk create from CSV (Mutation)
  const useBulkCreateFromCSV = () => {
    return useMutation({
      mutationFn: async (data: {
        csv_content: string;
        file_name: string;
        column_mapping?: Record<string, string>;
        options?: {
          validate_only?: boolean;
          skip_duplicates?: boolean;
          default_role?: "admin" | "participant";
        };
      }) => {
        const response = await apiClient.post("/users/bulk/csv", data);
        if (!response.success) {
          throw new Error(
            response.message || "Failed to create users from CSV"
          );
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("Bulk import berhasil!", {
          description: `${data.data.successful} users berhasil ditambahkan`,
        });
      },
      onError: (error: Error) => {
        console.error("Bulk CSV creation error:", error);
        toast.error("Gagal mengimport users", {
          description: error.message,
        });
      },
    });
  };

  // Bulk create from JSON (Mutation)
  const useBulkCreateFromJSON = () => {
    return useMutation({
      mutationFn: async (data: {
        users: Array<{
          nik: string;
          name: string;
          email: string;
          role?: "admin" | "participant";
          gender?: "male" | "female" | "other";
          phone?: string;
          birth_place?: string;
          birth_date?: string;
          religion?: string;
          education?: string;
          address?: string;
          province?: string;
          regency?: string;
          district?: string;
          village?: string;
          postal_code?: string;
          profile_picture_url?: string;
        }>;
        options?: {
          skip_duplicates?: boolean;
          validate_only?: boolean;
          default_role?: "admin" | "participant";
        };
      }) => {
        const response = await apiClient.post("/users/bulk/json", data);
        if (!response.success) {
          throw new Error(
            response.message || "Failed to create users from JSON"
          );
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        toast.success("Bulk import berhasil!", {
          description: `${data.data.successful} users berhasil ditambahkan`,
        });
      },
      onError: (error: Error) => {
        console.error("Bulk JSON creation error:", error);
        toast.error("Gagal mengimport users", {
          description: error.message,
        });
      },
    });
  };

  // Bulk delete users (Mutation)
  const useBulkDeleteUsers = () => {
    return useMutation({
      mutationFn: async (userIds: string[]) => {
        const response = await apiClient.delete("/users/bulk/delete", {
          data: { userIds },
        });
        if (!response.success) {
          throw new Error(response.message || "Failed to delete users");
        }
        return response;
      },
      onSuccess: (data) => {
        // Invalidate and refetch users list
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });

        const { deleted_count, failed_count } = data.data;

        if (failed_count > 0) {
          toast.success(`${deleted_count} users berhasil dihapus`, {
            description: `${failed_count} users gagal dihapus`,
          });
        } else {
          toast.success(`${deleted_count} users berhasil dihapus`);
        }
      },
      onError: (error: Error) => {
        console.error("Bulk delete error:", error);
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("last admin")) {
          toast.error("Tidak dapat menghapus semua admin", {
            description: "Minimal satu admin harus tetap aktif",
          });
        } else if (errorMessage.includes("own account")) {
          toast.error("Tidak dapat menghapus akun sendiri");
        } else {
          toast.error("Gagal menghapus users", {
            description: error.message,
          });
        }
      },
    });
  };

  // Bulk export users (Mutation)
  const useBulkExportUsers = () => {
    return useMutation({
      mutationFn: async (data: {
        user_ids: string[];
        format: "excel" | "pdf" | "csv";
        include_details?: boolean;
        filename?: string;
      }) => {
        const response = await apiClient.post("/users/bulk/export", data);
        if (!response.success) {
          throw new Error(response.message || "Failed to export users");
        }
        return response;
      },
      onSuccess: async (data, variables) => {
        const { format, user_ids } = variables;
        const { file_content, filename } = data.data;

        try {
          // Parse the JSON data from backend
          const exportData = JSON.parse(file_content);

          if (format === "pdf") {
            // Generate PDF using @react-pdf/renderer
            await generatePDF(exportData, filename);
          } else if (format === "excel") {
            // Generate Excel using xlsx
            await generateExcel(exportData, filename);
          }

          toast.success(`${user_ids.length} users berhasil diexport`, {
            description: `File ${filename} telah didownload`,
          });
        } catch (error) {
          console.error("Error generating file:", error);
          toast.error("Gagal membuat file export", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
      onError: (error: Error) => {
        console.error("Bulk export error:", error);
        toast.error("Gagal mengexport users", {
          description: error.message,
        });
      },
    });
  };

  return {
    // Queries
    useGetUsers,
    useGetUserById,

    // Mutations
    useCreateAdmin,
    useCreateParticipant,
    useUpdateUser,
    useDeleteUser,
    useBulkValidateCSV,
    useBulkCreateFromCSV,
    useBulkCreateFromJSON,
    useBulkDeleteUsers,
    useBulkExportUsers,
  };
}
