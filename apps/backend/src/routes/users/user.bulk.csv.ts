import { Context } from "hono";
import { or, inArray } from "drizzle-orm";
import { getDbFromEnv, users, isDatabaseConfigured } from "../../db";
import { getEnv, type CloudflareBindings } from "../../lib/env";
import {
  parseCSVContentSmart,
  detectSyntegraCSVColumns,
  transformSyntegraCSVRowToBulkUser,
  validateBulkUserData,
} from "@/lib/csv";
import {
  type CSVUploadRequest,
  type BulkCreateUsersResponse,
  type CSVValidationResponse,
  type BulkUserData,
  type BulkUserResult,
  type ErrorResponse,
  type CreateUserDB,
  BULK_CONSTANTS,
  BULK_ERROR_CODES,
  AUTH_ERROR_CODES,
} from "shared-types";

export async function validateSyntegraCSVHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    console.log("Validate Syntegra CSV Handler");

    // Check database configuration
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get authentication context
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authentication",
            message: "Admin authentication required for bulk operations",
            code: AUTH_ERROR_CODES.UNAUTHORIZED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Only admin can perform bulk operations
    if (auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only administrators can perform bulk user operations",
            code: AUTH_ERROR_CODES.FORBIDDEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const data = (await c.req.json()) as CSVUploadRequest;

    // Parse CSV content with Syntegra-specific detection
    const parseResult = parseCSVContentSmart(data.csv_content);

    if (!parseResult.success || !parseResult.data) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to parse CSV file",
        errors: [
          {
            field: "csv_parsing",
            message: parseResult.error || "Unknown parsing error",
            code: BULK_ERROR_CODES.CSV_PARSE_ERROR,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Get headers and detect columns
    const headers = Object.keys(parseResult.data[0] || {});
    console.log("Detected headers:", headers);

    const columnMapping = detectSyntegraCSVColumns(headers);
    console.log("Column mapping result:", columnMapping);

    if (columnMapping.missingColumns.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Missing required columns for Syntegra format",
        errors: [
          {
            field: "missing_columns",
            message: `Required columns not found: ${columnMapping.missingColumns.join(", ")}. Available headers: ${headers.join(", ")}`,
            code: BULK_ERROR_CODES.MISSING_REQUIRED_COLUMNS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Transform data
    const transformedUsers: BulkUserData[] = [];
    const previewResults: BulkUserResult[] = [];

    for (
      let i = 0;
      i < Math.min(BULK_CONSTANTS.PREVIEW_ROWS, parseResult.data.length);
      i++
    ) {
      const row = parseResult.data[i];
      const rowNumber = (parseResult.dataStartRow || 1) + i;

      const transformResult = transformSyntegraCSVRowToBulkUser(
        row,
        columnMapping.detectedMapping,
        rowNumber
      );

      if (transformResult.success && transformResult.data) {
        transformedUsers.push(transformResult.data);
        previewResults.push({
          row_number: rowNumber,
          nik: transformResult.data.nik,
          name: transformResult.data.name,
          email: transformResult.data.email,
          status: "success",
        });
      } else {
        previewResults.push({
          row_number: rowNumber,
          nik: row[columnMapping.detectedMapping.nik] || "N/A",
          name: row[columnMapping.detectedMapping.name] || "N/A",
          email: row[columnMapping.detectedMapping.email] || "N/A",
          status: "error",
          error: {
            message: transformResult.error || "Transformation failed",
            code: BULK_ERROR_CODES.VALIDATION_FAILED,
          },
        });
      }
    }

    // Validate all data
    const allTransformedUsers: BulkUserData[] = [];
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = (parseResult.dataStartRow || 1) + i;

      const transformResult = transformSyntegraCSVRowToBulkUser(
        row,
        columnMapping.detectedMapping,
        rowNumber
      );

      if (transformResult.success && transformResult.data) {
        allTransformedUsers.push(transformResult.data);
      }
    }

    const validation = validateBulkUserData(allTransformedUsers);

    const response: CSVValidationResponse = {
      success: true,
      message: "Syntegra CSV file validated successfully",
      data: {
        file_info: {
          total_rows: parseResult.totalRows,
          data_rows: parseResult.data.length,
          headers_found: headers,
          header_row: parseResult.headerRow,
          data_start_row: parseResult.dataStartRow,
        },
        column_mapping: columnMapping.detectedMapping,
        sample_data: parseResult.data.slice(0, BULK_CONSTANTS.SAMPLE_ROWS),
        validation_summary: {
          valid_rows: validation.validRows,
          invalid_rows: validation.invalidRows,
          missing_required_fields: columnMapping.missingColumns,
          duplicate_niks: validation.duplicateNiks,
          duplicate_emails: validation.duplicateEmails,
        },
        preview_results: previewResults,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Syntegra CSV validation error:", error);

    const env = getEnv(c);
    const errorResponse: ErrorResponse = {
      success: false,
      message: "CSV validation failed",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "CSV_VALIDATION_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

export async function createUsersFromCSVHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    // Check database configuration
    if (!isDatabaseConfigured(c.env)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Database not configured",
        errors: [
          {
            field: "database",
            message: "DATABASE_URL is not configured",
            code: "DATABASE_NOT_CONFIGURED",
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 503);
    }

    // Get authentication context
    const auth = c.get("auth");
    if (!auth) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Authentication required",
        errors: [
          {
            field: "authentication",
            message: "Admin authentication required for bulk operations",
            code: AUTH_ERROR_CODES.UNAUTHORIZED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 401);
    }

    // Only admin can perform bulk operations
    if (auth.user.role !== "admin") {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Access denied",
        errors: [
          {
            field: "authorization",
            message: "Only administrators can perform bulk user operations",
            code: AUTH_ERROR_CODES.FORBIDDEN,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 403);
    }

    const data = (await c.req.json()) as CSVUploadRequest;
    const env = getEnv(c);
    const db = getDbFromEnv(c.env);

    // Parse and validate CSV (same as validation endpoint)
    const parseResult = parseCSVContentSmart(data.csv_content);

    if (!parseResult.success || !parseResult.data) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Failed to parse CSV file",
        errors: [
          {
            field: "csv_parsing",
            message: parseResult.error || "Unknown parsing error",
            code: BULK_ERROR_CODES.CSV_PARSE_ERROR,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Detect column mapping
    const headers = Object.keys(parseResult.data[0] || {});
    const columnMapping = detectSyntegraCSVColumns(headers);

    if (columnMapping.missingColumns.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Missing required columns",
        errors: [
          {
            field: "missing_columns",
            message: `Required columns not found: ${columnMapping.missingColumns.join(", ")}`,
            code: BULK_ERROR_CODES.MISSING_REQUIRED_COLUMNS,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Transform data
    const transformedUsers: BulkUserData[] = [];
    const transformResults: BulkUserResult[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNumber = (parseResult.dataStartRow || 1) + i;

      const transformResult = transformSyntegraCSVRowToBulkUser(
        row,
        columnMapping.detectedMapping,
        rowNumber
      );

      if (transformResult.success && transformResult.data) {
        transformedUsers.push(transformResult.data);
      } else {
        transformResults.push({
          row_number: rowNumber,
          nik: row[columnMapping.detectedMapping.nik] || "N/A",
          name: row[columnMapping.detectedMapping.name] || "N/A",
          email: row[columnMapping.detectedMapping.email] || "N/A",
          status: "error",
          error: {
            message: transformResult.error || "Transformation failed",
            code: BULK_ERROR_CODES.VALIDATION_FAILED,
          },
        });
      }
    }

    // Check batch size
    if (transformedUsers.length > BULK_CONSTANTS.MAX_USERS_PER_BATCH) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Batch size exceeded",
        errors: [
          {
            field: "batch_size",
            message: `Maximum ${BULK_CONSTANTS.MAX_USERS_PER_BATCH} users per batch`,
            code: BULK_ERROR_CODES.BATCH_SIZE_EXCEEDED,
          },
        ],
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate data
    const validation = validateBulkUserData(transformedUsers);
    transformResults.push(...validation.results);

    // Check for existing users in database if not skipping duplicates
    const validUsers = transformedUsers.filter(
      (_, index) => validation.results[index]?.status === "success"
    );

    if (!data.options?.skip_duplicates && validUsers.length > 0) {
      const niks = validUsers.map((u) => u.nik);
      const emails = validUsers.map((u) => u.email);

      const existingUsers = await db
        .select({ nik: users.nik, email: users.email })
        .from(users)
        .where(or(inArray(users.nik, niks), inArray(users.email, emails)));

      const existingNiks = new Set(existingUsers.map((u) => u.nik));
      const existingEmails = new Set(existingUsers.map((u) => u.email));

      // Mark existing users as errors
      for (let i = 0; i < validUsers.length; i++) {
        const user = validUsers[i];
        const resultIndex = transformResults.findIndex(
          (r) => r.nik === user.nik && r.status === "success"
        );

        if (existingNiks.has(user.nik)) {
          transformResults[resultIndex] = {
            ...transformResults[resultIndex],
            status: "error",
            error: {
              field: "nik",
              message: "NIK already exists in database",
              code: BULK_ERROR_CODES.DUPLICATE_NIK,
            },
          };
        } else if (existingEmails.has(user.email)) {
          transformResults[resultIndex] = {
            ...transformResults[resultIndex],
            status: "error",
            error: {
              field: "email",
              message: "Email already exists in database",
              code: BULK_ERROR_CODES.DUPLICATE_EMAIL,
            },
          };
        }
      }
    }

    // If validate_only option is set, return without creating users
    if (data.options?.validate_only) {
      const finalCounts = transformResults.reduce(
        (acc, result) => {
          if (result.status === "success") acc.successful++;
          else if (result.status === "error") acc.failed++;
          else if (result.status === "skipped") acc.skipped++;
          return acc;
        },
        { successful: 0, failed: 0, skipped: 0 }
      );

      const summary = {
        duplicates_found: validation.duplicateNiks + validation.duplicateEmails,
        validation_errors: validation.invalidRows,
        database_errors: 0,
      };

      const response: BulkCreateUsersResponse = {
        success: true,
        message: "CSV validation completed successfully",
        data: {
          total_processed: transformedUsers.length,
          successful: finalCounts.successful,
          failed: finalCounts.failed,
          skipped: finalCounts.skipped,
          results: transformResults,
          summary,
        },
        timestamp: new Date().toISOString(),
      };

      return c.json(response, 200);
    }

    // Create users in database
    const usersToCreate = validUsers.filter((user, index) => {
      const result = transformResults.find((r) => r.nik === user.nik);
      return result?.status === "success";
    });

    let successful = 0;
    let failed = 0;

    // Batch insert users
    if (usersToCreate.length > 0) {
      const insertData: CreateUserDB[] = usersToCreate.map((user) => ({
        nik: user.nik,
        name: user.name,
        role: user.role || "participant",
        email: user.email,
        password: null, // Participants don't have passwords
        gender: user.gender || "other",
        phone: user.phone || "",
        birth_place: user.birth_place || null,
        birth_date: user.birth_date ? new Date(user.birth_date) : null,
        religion: user.religion || null,
        education: user.education || null,
        address: user.address || null,
        province: user.province || null,
        regency: user.regency || null,
        district: user.district || null,
        village: user.village || null,
        postal_code: user.postal_code || null,
        profile_picture_url: user.profile_picture_url || null,
        is_active: true,
        email_verified: false,
        login_attempts: 0,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      }));

      try {
        const createdUsers = await db
          .insert(users)
          .values(insertData)
          .returning({
            id: users.id,
            nik: users.nik,
            name: users.name,
            email: users.email,
            role: users.role,
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
            created_by: users.created_by,
            updated_by: users.updated_by,
          });

        successful = createdUsers.length;

        // Update results with successful creations
        for (const createdUser of createdUsers) {
          const resultIndex = transformResults.findIndex(
            (r) => r.nik === createdUser.nik
          );
          if (resultIndex !== -1) {
            transformResults[resultIndex] = {
              ...transformResults[resultIndex],
              status: "success",
              user_data: {
                id: createdUser.id,
                nik: createdUser.nik || "",
                name: createdUser.name,
                role: createdUser.role,
                email: createdUser.email,
                gender: createdUser.gender || "other",
                phone: createdUser.phone || "",
                birth_place: createdUser.birth_place,
                birth_date: createdUser.birth_date,
                religion: createdUser.religion,
                education: createdUser.education,
                address: createdUser.address,
                province: createdUser.province,
                regency: createdUser.regency,
                district: createdUser.district,
                village: createdUser.village,
                postal_code: createdUser.postal_code,
                profile_picture_url: createdUser.profile_picture_url,
                is_active: createdUser.is_active ?? true,
                email_verified: createdUser.email_verified ?? false,
                created_at: createdUser.created_at,
                updated_at: createdUser.updated_at,
                created_by: createdUser.created_by,
                updated_by: createdUser.updated_by,
              },
            };
          }
        }
      } catch (dbError) {
        console.error("Database batch insert error:", dbError);

        // Mark all intended users as failed
        for (const user of usersToCreate) {
          const resultIndex = transformResults.findIndex(
            (r) => r.nik === user.nik
          );
          if (
            resultIndex !== -1 &&
            transformResults[resultIndex].status === "success"
          ) {
            transformResults[resultIndex] = {
              ...transformResults[resultIndex],
              status: "error",
              error: {
                message: "Database insertion failed",
                code: BULK_ERROR_CODES.DATABASE_BATCH_ERROR,
              },
            };
            failed++;
          }
        }
      }
    }

    // Count final results
    const finalCounts = transformResults.reduce(
      (acc, result) => {
        if (result.status === "success") acc.successful++;
        else if (result.status === "error") acc.failed++;
        else if (result.status === "skipped") acc.skipped++;
        return acc;
      },
      { successful: 0, failed: 0, skipped: 0 }
    );

    const summary = {
      duplicates_found: validation.duplicateNiks + validation.duplicateEmails,
      validation_errors: validation.invalidRows,
      database_errors: failed,
    };

    const response: BulkCreateUsersResponse = {
      success: finalCounts.successful > 0,
      message: `Bulk user creation from CSV completed. ${finalCounts.successful} users created, ${finalCounts.failed} failed, ${finalCounts.skipped} skipped`,
      data: {
        total_processed: transformedUsers.length,
        successful: finalCounts.successful,
        failed: finalCounts.failed,
        skipped: finalCounts.skipped,
        results: transformResults,
        summary,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, finalCounts.successful > 0 ? 201 : 400);
  } catch (error) {
    console.error("Bulk user creation from CSV error:", error);

    const env = getEnv(c);
    const errorResponse: ErrorResponse = {
      success: false,
      message: "Bulk user creation from CSV failed",
      ...(env.NODE_ENV === "development" && {
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "CSV_BULK_CREATE_ERROR",
          },
        ],
      }),
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
