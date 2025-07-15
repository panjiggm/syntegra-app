import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";

// UI Components
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

// Icons
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  Users,
  Info,
} from "lucide-react";

// Hooks
import { useUsers } from "~/hooks/use-users";
import { BulkImportPreview } from "~/components/admin/users-bulk/BulkImportPreview";
import { BulkImportResults } from "~/components/admin/users-bulk/BulkImportResults";
import { BulkImportStats } from "~/components/admin/users-bulk/BulkImportStats";
import type { Route } from "./+types/admin.users.bulk";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bulk Import Users - Syntegra Psikotes" },
    {
      name: "description",
      content: "Import users secara massal dari file Excel",
    },
  ];
}

// Types
interface ParsedUser {
  row_number: number;
  nik: string;
  name: string;
  email: string;
  gender?: string;
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
}

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    row_number: number;
    field: string;
    message: string;
    value: string;
  }>;
  warnings: Array<{
    row_number: number;
    field: string;
    message: string;
    value: string;
  }>;
}

interface BulkImportState {
  step: "upload" | "preview" | "validate" | "submit" | "results";
  file: File | null;
  parsedData: ParsedUser[];
  csvContent: string;
  validationResult: ValidationResult | null;
  submitResult: any;
  isLoading: boolean;
  error: string | null;
}

// Updated column mapping based on actual Excel file structure
const DEFAULT_COLUMN_MAPPING = {
  nik: "NIK KTP",
  name: "NAMA",
  email: "E-MAIL",
  gender: "SEX",
  phone: "NOMOR HP",
  birth_place: "TEMPAT LAHIR",
  birth_date: "TANGGAL LAHIR",
  religion: "AGAMA",
  education: "PENDIDIKAN TERAKHIR",
  address: "ALAMAT KTP",
  province: "CABANG", // Map to branch as proxy for location
};

export default function AdminUsersBulkPage() {
  const navigate = useNavigate();
  const { useBulkValidateCSV, useBulkCreateFromCSV } = useUsers();

  const [state, setState] = useState<BulkImportState>({
    step: "upload",
    file: null,
    parsedData: [],
    csvContent: "",
    validationResult: null,
    submitResult: null,
    isLoading: false,
    error: null,
  });

  // Mutations
  const validateMutation = useBulkValidateCSV();
  const submitMutation = useBulkCreateFromCSV();

  // File upload handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState((prev) => ({
      ...prev,
      file,
      isLoading: true,
      error: null,
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        console.log("Available sheets:", workbook.SheetNames);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        console.log("Using sheet:", firstSheetName);
        console.log("Sheet range:", worksheet["!ref"]);

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          raw: false, // This will format dates as strings instead of keeping them as numbers
          dateNF: "dd/mm/yyyy", // Format dates as DD/MM/YYYY
        }) as string[][];

        console.log("Raw Excel data rows:", jsonData.length);
        console.log("First 5 rows:", jsonData.slice(0, 5));

        if (jsonData.length < 6) {
          throw new Error(
            "File Excel harus memiliki minimal 6 baris untuk format Syntegra"
          );
        }

        let headerRowIndex = -1;
        let headers: string[] = [];

        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] || [];
          console.log(`Row ${i + 1}:`, row);

          const hasRequiredColumns = Object.values(DEFAULT_COLUMN_MAPPING).some(
            (expectedHeader) =>
              row.some(
                (cell) =>
                  cell &&
                  cell
                    .toString()
                    .replace(/\u00A0/g, " ")
                    .toUpperCase()
                    .includes(expectedHeader.toUpperCase())
              )
          );

          console.log(`Row ${i + 1} has required columns:`, hasRequiredColumns);

          if (hasRequiredColumns) {
            headerRowIndex = i;
            headers = row.map((cell) =>
              cell
                ? cell
                    .toString()
                    .replace(/\u00A0/g, " ")
                    .trim()
                : ""
            );
            console.log(`Selected header row ${i + 1}:`, headers);
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error(
            `Header tidak ditemukan. Pastikan file memiliki kolom: ${Object.values(DEFAULT_COLUMN_MAPPING).join(", ")}`
          );
        }

        console.log(
          "Detected headers at row",
          headerRowIndex + 1,
          ":",
          headers
        );
        console.log("Column mapping check:");
        Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
          ([key, expectedHeader]) => {
            const found = headers.find((h) => {
              const headerStr = h.toString().toUpperCase().trim();
              const expectedStr = expectedHeader.toUpperCase().trim();
              return (
                headerStr === expectedStr ||
                headerStr.includes(expectedStr) ||
                expectedStr.includes(headerStr)
              );
            });
            console.log(
              `  ${key} (${expectedHeader}):`,
              found ? `✓ Found: "${found}"` : "✗ Missing"
            );
          }
        );

        // Validasi kolom wajib ditemukan semua
        const missingColumns: string[] = [];
        Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
          ([key, expectedHeader]) => {
            const found = headers.some((h) => {
              const headerStr = h.toString().toUpperCase().trim();
              const expectedStr = expectedHeader.toUpperCase().trim();
              if (headerStr === expectedStr) return true;
              if (key === "phone") return headerStr.includes("NOMOR HP");
              return (
                headerStr.includes(expectedStr) ||
                expectedStr.includes(headerStr)
              );
            });
            if (!found) missingColumns.push(expectedHeader);
          }
        );

        if (missingColumns.length > 0) {
          throw new Error(
            `Kolom berikut tidak ditemukan: ${missingColumns.join(", ")}`
          );
        }

        const rows = jsonData.slice(headerRowIndex + 1);
        console.log(`Data rows after header (${rows.length} rows):`, rows);

        const parsedUsers: ParsedUser[] = rows
          .map((row, index) => {
            const user: any = { row_number: headerRowIndex + index + 2 };

            Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
              ([key, expectedHeader]) => {
                const columnIndex = headers.findIndex((h) => {
                  const headerStr = h.toUpperCase().trim();
                  const expectedStr = expectedHeader.toUpperCase().trim();
                  if (headerStr === expectedStr) return true;
                  if (key === "phone") return headerStr.includes("NOMOR HP");
                  return (
                    headerStr.includes(expectedStr) ||
                    expectedStr.includes(headerStr)
                  );
                });

                if (columnIndex !== -1 && row[columnIndex]) {
                  let value = row[columnIndex].toString().trim();

                  if (key === "nik" && value) {
                    value = value.replace(/\D/g, "");
                    if (value.length > 16) value = value.substring(0, 16);
                  }

                  if (key === "gender" && value) {
                    value =
                      value.toUpperCase() === "L"
                        ? "male"
                        : value.toUpperCase() === "P"
                          ? "female"
                          : value.toLowerCase();
                  }

                  if (key === "birth_date" && value) {
                    try {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        value = date.toISOString().split("T")[0];
                      }
                    } catch {
                      // Do nothing, keep original value
                    }
                  }

                  user[key] = value;
                }
              }
            );

            if (!user.email && user.name) {
              const cleanName = user.name
                .toLowerCase()
                .replace(/[^a-z\s]/g, "")
                .replace(/\s+/g, ".");
              user.email = `${cleanName}@syntegra.com`;
            }

            if (!user.nik && user.name) {
              const now = new Date();
              const year = now.getFullYear().toString();
              const month = (now.getMonth() + 1).toString().padStart(2, "0");
              const day = now.getDate().toString().padStart(2, "0");
              const hour = now.getHours().toString().padStart(2, "0");
              const minute = now.getMinutes().toString().padStart(2, "0");
              const second = now.getSeconds().toString().padStart(2, "0");

              user.nik = `99${year}${month}${day}${hour}${minute}${second}`;
            }

            return user;
          })
          .filter((user) => user.name);

        if (parsedUsers.length === 0) {
          throw new Error(
            "Tidak ada data karyawan yang valid ditemukan. Pastikan file memiliki data di bawah header."
          );
        }

        console.log(
          `Parsed ${parsedUsers.length} valid users:`,
          parsedUsers.slice(0, 2)
        );

        const csvData = parsedUsers.map((user) => {
          const csvRow: any = {};
          Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
            ([field, originalHeader]) => {
              csvRow[originalHeader] = user[field as keyof ParsedUser] || "";
            }
          );
          return csvRow;
        });

        const csvContent = Papa.unparse(csvData, { header: true });

        setState((prev) => ({
          ...prev,
          parsedData: parsedUsers,
          csvContent,
          step: "preview",
          isLoading: false,
        }));

        toast.success(
          `File berhasil diparse: ${parsedUsers.length} karyawan ditemukan dari ${firstSheetName} sheet`
        );
      } catch (error) {
        console.error("Error parsing file:", error);

        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Gagal memparse file Excel",
          isLoading: false,
        }));

        toast.error("Gagal memparse file Excel", {
          description:
            error instanceof Error
              ? error.message
              : "Periksa apakah file memiliki header yang benar",
          duration: 10000,
        });
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Validate CSV
  const handleValidate = async () => {
    if (!state.csvContent) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await validateMutation.mutateAsync({
        csv_content: state.csvContent,
        file_name: state.file?.name || "bulk_users.csv",
        column_mapping: DEFAULT_COLUMN_MAPPING,
        options: {
          validate_only: true,
          skip_duplicates: false,
          default_role: "participant",
        },
      });

      // Handle different response structures
      const responseData = result.data || result;
      const summary = responseData.summary || {};
      const results = responseData.results || [];

      setState((prev) => ({
        ...prev,
        validationResult: {
          valid: (summary.validation_errors || 0) === 0,
          errors: results
            .filter((r: any) => r.status === "error")
            .map((r: any) => ({
              row_number: r.row_number || 0,
              field: r.error?.field || "unknown",
              message: r.error?.message || "Unknown error",
              value: r.email || r.nik || "",
            })),
          warnings: results
            .filter((r: any) => r.status === "skipped")
            .map((r: any) => ({
              row_number: r.row_number || 0,
              field: "duplicate",
              message: r.error?.message || "Duplicate entry",
              value: r.email || r.nik || "",
            })),
        },
        step: "validate",
        isLoading: false,
      }));

      if ((summary.validation_errors || 0) === 0) {
        toast.success("Validasi berhasil! Data siap untuk diimport");
      } else {
        toast.warning(
          `Ditemukan ${summary.validation_errors || 0} error dalam data`
        );
      }
    } catch (error) {
      console.error("Validation error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        response: error || "No response data",
      });

      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Gagal memvalidasi data",
        isLoading: false,
      }));

      toast.error("Gagal memvalidasi data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Submit bulk import
  const handleSubmit = async () => {
    if (!state.csvContent) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await submitMutation.mutateAsync({
        csv_content: state.csvContent,
        file_name: state.file?.name || "bulk_users.csv",
        column_mapping: DEFAULT_COLUMN_MAPPING,
        options: {
          validate_only: false,
          skip_duplicates: true,
          default_role: "participant",
        },
      });

      setState((prev) => ({
        ...prev,
        submitResult: result,
        step: "results",
        isLoading: false,
      }));

      toast.success(
        `Import berhasil! ${result.data.successful} users berhasil ditambahkan`
      );
    } catch (error: any) {
      console.error("Submit error:", error);

      // Extract detailed error information from response
      const responseData = error?.response?.data?.data;
      const results = responseData?.results || [];
      const summary = responseData?.summary || {};

      // Map errors to show detailed information
      const mapErrors = results
        .filter((r: any) => r.status === "error")
        .map((r: any) => ({
          row: r.row_number,
          user: r.name || r.nik,
          message: r.error?.message || "Unknown error",
          code: r.error?.code || "UNKNOWN",
        }));

      // Create comprehensive error message
      let errorMessage =
        error?.response?.data?.message || "Gagal mengimport data";

      if (mapErrors.length > 0) {
        const errorDetails = mapErrors
          .slice(0, 3)
          .map((err: any) => `Row ${err.row} (${err.user}): ${err.message}`)
          .join("; ");

        errorMessage = `Import gagal. ${errorDetails}${mapErrors.length > 3 ? ` dan ${mapErrors.length - 3} error lainnya` : ""}`;
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));

      toast.error("Import gagal", {
        description: `${summary.database_errors || 0} database errors, ${summary.validation_errors || 0} validation errors`,
        duration: 8000,
      });
    }
  };

  // Reset state
  const handleReset = () => {
    setState({
      step: "upload",
      file: null,
      parsedData: [],
      csvContent: "",
      validationResult: null,
      submitResult: null,
      isLoading: false,
      error: null,
    });
  };

  // Download template from static file
  const handleDownloadTemplate = () => {
    const templatePath = "/template/TEMPLATE PESERTA SYNTEGRA.xlsx";
    const link = document.createElement("a");
    link.href = templatePath;
    link.download = "TEMPLATE PESERTA SYNTEGRA.xlsx";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Template Excel berhasil didownload");
  };

  // Stats calculation
  const stats = useMemo(() => {
    if (state.step === "results" && state.submitResult) {
      const data = state.submitResult.data || {};
      return {
        total: data.total_processed || 0,
        successful: data.successful || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
      };
    }

    if (state.step === "validate" && state.validationResult) {
      const errors = state.validationResult.errors || [];
      const warnings = state.validationResult.warnings || [];
      return {
        total: state.parsedData.length,
        valid: state.parsedData.length - errors.length,
        errors: errors.length,
        warnings: warnings.length,
      };
    }

    return {
      total: state.parsedData.length,
    };
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div>
            <Button
              variant="link"
              size="sm"
              className="cursor-pointer"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              Bulk Import Users
            </h1>
            <p className="text-muted-foreground text-xs">
              Import users secara massal dari file Excel
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template Peserta
          </Button>
          {state.step !== "upload" && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            {["upload", "preview", "validate", "submit", "results"].map(
              (step, index) => (
                <div
                  key={step}
                  className={`flex items-center ${
                    index <
                    [
                      "upload",
                      "preview",
                      "validate",
                      "submit",
                      "results",
                    ].indexOf(state.step)
                      ? "text-green-600"
                      : index ===
                          [
                            "upload",
                            "preview",
                            "validate",
                            "submit",
                            "results",
                          ].indexOf(state.step)
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                      index <
                      [
                        "upload",
                        "preview",
                        "validate",
                        "submit",
                        "results",
                      ].indexOf(state.step)
                        ? "bg-green-100 border-green-600"
                        : index ===
                            [
                              "upload",
                              "preview",
                              "validate",
                              "submit",
                              "results",
                            ].indexOf(state.step)
                          ? "bg-blue-100 border-blue-600"
                          : "bg-gray-100 border-gray-400"
                    } border-2`}
                  >
                    {index <
                    [
                      "upload",
                      "preview",
                      "validate",
                      "submit",
                      "results",
                    ].indexOf(state.step) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="capitalize text-sm font-medium">
                    {step === "upload" && "Upload File"}
                    {step === "preview" && "Preview Data"}
                    {step === "validate" && "Validate"}
                    {step === "submit" && "Submit"}
                    {step === "results" && "Results"}
                  </span>
                  {index < 4 && <div className="w-8 h-0.5 bg-gray-300 mx-4" />}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {Object.keys(stats).length > 1 && <BulkImportStats stats={stats} />}

      {/* Error Alert */}
      {state.error && (
        <Alert
          variant="destructive"
          className="bg-red-50 border border-red-400"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Import Error</div>
              <div className="text-sm">{state.error}</div>
              {state.error.includes("Row") && (
                <div className="text-xs text-muted-foreground">
                  Silakan periksa data di row yang bermasalah dan coba upload
                  ulang. Cek apakah Nama/Email/No Hp/NIK ada yang sama.
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Information - only show in development or when error occurs */}
      {(state.error || process.env.NODE_ENV === "development") &&
        state.parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Debug Information
              </CardTitle>
              <CardDescription>
                Information about the parsing process to help troubleshoot
                issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">File Statistics:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Filename: {state.file?.name}</div>
                    <div>
                      File size:{" "}
                      {state.file ? Math.round(state.file.size / 1024) : 0} KB
                    </div>
                    <div>Parsed records: {state.parsedData.length}</div>
                    <div>CSV length: {state.csvContent.length} chars</div>
                  </div>
                </div>

                {state.parsedData.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">
                      Sample Parsed Data (First Record):
                    </h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(state.parsedData[0], null, 2)}
                    </pre>
                  </div>
                )}

                {state.csvContent && (
                  <div>
                    <h4 className="font-medium mb-2">
                      CSV Preview (First 3 lines):
                    </h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                      {state.csvContent.split("\n").slice(0, 3).join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Content based on step */}
      {state.step === "upload" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload File Excel Karyawan
              </CardTitle>
              <CardDescription>
                Upload file Excel database karyawan Syntegra (.xlsx atau .xls).
                Sistem akan otomatis mendeteksi header dan mengkonversi data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive
                        ? "Drop file Excel di sini..."
                        : "Drag & drop file Excel atau klik untuk pilih"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mendukung format .xlsx dan .xls (maksimal 10MB)
                    </p>
                  </div>
                </div>
              </div>

              {state.isLoading && (
                <div className="mt-4 flex items-center gap-2">
                  <LoadingSpinner className="h-4 w-4" />
                  <span className="text-sm">Memparse file Excel...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Format File Excel yang Diharapkan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Struktur File Syntegra
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Sheet "DB" sebagai data utama</li>
                    <li>• Header di Row 5 (bukan Row 1)</li>
                    <li>• Data dimulai dari Row 6</li>
                    <li>• Kolom wajib: NAMA, NIK KTP, EMAIL</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    Fitur Otomatis
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Auto-detect header row</li>
                    <li>• Generate email jika kosong</li>
                    <li>• Convert format data otomatis</li>
                    <li>• Fallback untuk NIK kosong</li>
                  </ul>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Tips:</strong> Jika parsing gagal, pastikan file Excel
                  memiliki kolom NAMA, NIK KTP, atau EMAIL yang jelas di header
                  row. Sistem akan otomatis mencari header di 10 baris pertama
                  file.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {state.step === "preview" && (
        <BulkImportPreview
          data={state.parsedData}
          onValidate={handleValidate}
          isLoading={state.isLoading}
        />
      )}

      {state.step === "validate" && state.validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state.validationResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Hasil Validasi
            </CardTitle>
            <CardDescription>
              {state.validationResult.valid
                ? "Data valid dan siap untuk diimport"
                : "Ditemukan error dalam data yang harus diperbaiki"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Validation Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {stats.total - (stats.errors || 0)}
                </div>
                <div className="text-sm text-green-600">Valid Records</div>
              </div>
              {(stats.errors || 0) > 0 && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.errors}
                  </div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              )}
              {(stats.warnings || 0) > 0 && (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.warnings}
                  </div>
                  <div className="text-sm text-yellow-600">Warnings</div>
                </div>
              )}
            </div>

            {/* Error Details */}
            {state.validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">
                  Errors yang harus diperbaiki:
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {state.validationResult.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Row {error.row_number}</strong> - {error.field}:{" "}
                        {error.message}
                        {error.value && (
                          <span className="ml-2 text-xs">({error.value})</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Warning Details */}
            {state.validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-600">
                  Warnings (akan dilewati):
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {state.validationResult.warnings
                    .slice(0, 5)
                    .map((warning, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Row {warning.row_number}</strong> -{" "}
                          {warning.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  {state.validationResult.warnings.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... dan {state.validationResult.warnings.length - 5}{" "}
                      warning lainnya
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <Separator />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setState((prev) => ({ ...prev, step: "preview" }))
                }
              >
                Kembali ke Preview
              </Button>
              {state.validationResult.valid && (
                <Button onClick={handleSubmit} disabled={state.isLoading}>
                  {state.isLoading ? (
                    <>
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Import {stats.total - (stats.errors || 0)} Users
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "results" && state.submitResult && (
        <BulkImportResults
          result={state.submitResult}
          onReset={handleReset}
          onViewUsers={() => navigate("/admin/users")}
        />
      )}
    </div>
  );
}
