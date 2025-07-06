import { Context } from "hono";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import { and, or, eq, like, ilike, inArray } from "drizzle-orm";
import {
  type ErrorResponse,
} from "shared-types";

// Schema untuk bulk export request
export interface BulkExportUsersRequest {
  user_ids: string[];
  format: "excel" | "pdf" | "csv";
  include_details?: boolean;
  filename?: string;
}

// Response interface untuk bulk export
export interface BulkExportUsersResponse {
  success: boolean;
  message: string;
  data: {
    download_url?: string;
    file_content?: string;
    filename: string;
    format: string;
    total_users: number;
  };
  timestamp: string;
}

export async function bulkExportUsersHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check if database is configured first
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message:
              "DATABASE_URL is not configured. Please set your Neon database connection string in wrangler.jsonc",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Parse request body
    const body = await c.req.json() as BulkExportUsersRequest;

    // Validate request
    if (!body.user_ids || !Array.isArray(body.user_ids) || body.user_ids.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid request: user_ids array is required and cannot be empty",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    if (!body.format || !["excel", "pdf", "csv"].includes(body.format)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Invalid format. Must be 'excel', 'pdf', or 'csv'",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get database connection
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Fetch users by IDs
    const selectedUsers = await db
      .select({
        id: users.id,
        nik: users.nik,
        name: users.name,
        role: users.role,
        email: users.email,
        gender: users.gender,
        phone: users.phone,
        birth_place: users.birth_place,
        birth_date: users.birth_date,
        religion: users.religion,
        education: users.education,
        address: users.address,
        province: users.province,
        regency: users.regency,
        district: users.district,
        village: users.village,
        postal_code: users.postal_code,
        profile_picture_url: users.profile_picture_url,
        is_active: users.is_active,
        email_verified: users.email_verified,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(inArray(users.id, body.user_ids));

    if (selectedUsers.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "No users found with the provided IDs",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 404);
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const defaultFilename = `users_export_${timestamp}.${body.format}`;
    const filename = body.filename || defaultFilename;

    // Prepare structured data for client-side generation
    const exportData = {
      users: selectedUsers.map(user => ({
        id: user.id,
        nik: user.nik || "",
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender || "",
        phone: user.phone || "",
        birth_place: user.birth_place || "",
        birth_date: user.birth_date ? user.birth_date.toISOString() : "",
        religion: user.religion || "",
        education: user.education || "",
        address: user.address || "",
        province: user.province || "",
        regency: user.regency || "",
        district: user.district || "",
        village: user.village || "",
        postal_code: user.postal_code || "",
        profile_picture_url: user.profile_picture_url || "",
        is_active: user.is_active,
        email_verified: user.email_verified,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      })),
      metadata: {
        total_users: selectedUsers.length,
        generated_at: new Date().toISOString(),
        include_details: body.include_details || false,
        format: body.format,
        filename: filename,
        export_title: `Export Data Users - ${selectedUsers.length} Users`,
        export_date: new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric", 
          month: "long",
          day: "numeric"
        }),
      }
    };

    // Return response with structured data for client-side generation
    const response: BulkExportUsersResponse = {
      success: true,
      message: `Successfully prepared ${selectedUsers.length} users data for ${body.format.toUpperCase()} export`,
      data: {
        file_content: JSON.stringify(exportData),
        filename: filename,
        format: body.format,
        total_users: selectedUsers.length,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);

  } catch (error) {
    console.error("Error in bulk export users:", error);

    // Get environment for error handling
    const env = getEnv(c);

    // Handle specific database errors
    if (error instanceof Error) {
      // Handle database connection errors
      if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        const errorResponse: ErrorResponse = {
          success: false,
          message: "Database connection error",
          timestamp: new Date().toISOString(),
        };
        return c.json(errorResponse, 503);
      }
    }

    // Generic error response
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Internal server error during export",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "EXPORT_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// Helper function to generate CSV content
function generateCSVContent(users: any[], includeDetails: boolean = false): string {
  const headers = [
    "ID",
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
    "Status Aktif",
    "Email Terverifikasi",
    "Tanggal Dibuat",
  ];

  if (includeDetails) {
    headers.push(
      "Alamat",
      "Provinsi", 
      "Kabupaten",
      "Kecamatan",
      "Kelurahan",
      "Kode Pos",
      "URL Foto Profil",
      "Tanggal Update"
    );
  }

  const rows = users.map(user => {
    const row = [
      user.id,
      user.nik || "",
      user.name,
      user.email,
      user.role,
      user.gender || "",
      user.phone || "",
      user.birth_place || "",
      user.birth_date ? new Date(user.birth_date).toLocaleDateString("id-ID") : "",
      user.religion || "",
      user.education || "",
      user.is_active ? "Aktif" : "Tidak Aktif",
      user.email_verified ? "Terverifikasi" : "Belum Terverifikasi",
      new Date(user.created_at).toLocaleDateString("id-ID"),
    ];

    if (includeDetails) {
      row.push(
        user.address || "",
        user.province || "",
        user.regency || "",
        user.district || "",
        user.village || "",
        user.postal_code || "",
        user.profile_picture_url || "",
        new Date(user.updated_at).toLocaleDateString("id-ID")
      );
    }

    return row;
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // Add BOM for proper UTF-8 encoding in Excel
  return "\uFEFF" + csvContent;
}

// Helper function to generate Excel-compatible CSV
function generateExcelCompatibleCSV(users: any[], includeDetails: boolean = false): string {
  // For now, same as CSV but with Excel-specific formatting
  return generateCSVContent(users, includeDetails);
}