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

    // Parse Excel file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as string[][];

        if (jsonData.length < 6) {
          throw new Error(
            "File Excel harus memiliki minimal 6 baris untuk format Syntegra"
          );
        }

        // Smart header detection for Syntegra format
        let headerRowIndex = -1;
        let headers: string[] = [];

        // Look for header row in first 10 rows
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          const hasRequiredColumns = Object.values(DEFAULT_COLUMN_MAPPING).some(
            (expectedHeader) =>
              row.some(
                (cell) =>
                  cell &&
                  cell
                    .toString()
                    .toUpperCase()
                    .includes(expectedHeader.toUpperCase())
              )
          );

          if (hasRequiredColumns) {
            headerRowIndex = i;
            headers = row.map((cell) => (cell ? cell.toString().trim() : ""));
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error(
            `Header tidak ditemukan. Pastikan file memiliki kolom: ${Object.values(DEFAULT_COLUMN_MAPPING).join(", ")}`
          );
        }

        // Get data rows after header
        const rows = jsonData.slice(headerRowIndex + 1);

        Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
          ([key, expectedHeader]) => {
            const columnIndex = headers.findIndex((h) => {
              const headerStr = h.toString().toUpperCase().trim();
              const expectedStr = expectedHeader.toUpperCase().trim();

              // Exact match first
              if (headerStr === expectedStr) return true;

              // For phone specifically, be more precise
              if (key === "phone") {
                return (
                  headerStr === "NOMOR HP" || headerStr.includes("NOMOR HP")
                );
              }

              // For other fields, check if header contains expected or vice versa
              return (
                headerStr.includes(expectedStr) ||
                expectedStr.includes(headerStr)
              );
            });
          }
        );

        const parsedUsers: ParsedUser[] = rows
          .map((row, index) => {
            const user: any = { row_number: headerRowIndex + index + 2 }; // Actual row number in Excel

            // Map columns based on default mapping
            Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
              ([key, expectedHeader]) => {
                const columnIndex = headers.findIndex((h) => {
                  const headerStr = h.toString().toUpperCase().trim();
                  const expectedStr = expectedHeader.toUpperCase().trim();

                  // Exact match first
                  if (headerStr === expectedStr) return true;

                  // For phone specifically, be more precise
                  if (key === "phone") {
                    return (
                      headerStr === "NOMOR HP" || headerStr.includes("NOMOR HP")
                    );
                  }

                  // For other fields, check if header contains expected or vice versa
                  return (
                    headerStr.includes(expectedStr) ||
                    expectedStr.includes(headerStr)
                  );
                });

                if (columnIndex !== -1 && row[columnIndex]) {
                  let value = row[columnIndex].toString().trim();

                  // Handle specific field transformations
                  if (key === "nik" && value) {
                    // Clean NIK: remove non-numeric characters and ensure 16 digits
                    value = value.replace(/\D/g, ""); // Remove all non-digits
                    if (value.length > 16) {
                      value = value.substring(0, 16); // Truncate if too long
                    }
                    // NIK validation will be done by backend, just clean here
                  }

                  if (key === "gender" && value) {
                    // Convert gender format (L/P to male/female)
                    value =
                      value.toUpperCase() === "L"
                        ? "male"
                        : value.toUpperCase() === "P"
                          ? "female"
                          : value.toLowerCase();
                  }

                  if (key === "birth_date" && value) {
                    // Handle various date formats
                    try {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        value = date.toISOString().split("T")[0]; // YYYY-MM-DD format
                      }
                    } catch (e) {
                      // Keep original value if date parsing fails
                    }
                  }

                  user[key] = value;
                }
              }
            );

            // Generate email if missing but name exists
            if (!user.email && user.name) {
              const cleanName = user.name
                .toLowerCase()
                .replace(/[^a-z\s]/g, "")
                .replace(/\s+/g, ".");
              user.email = `${cleanName}@syntegra.com`;
            }

            // Generate 16-digit numeric NIK if missing
            if (!user.nik && user.name) {
              // Generate a 16-digit NIK starting with "99" (indicating generated)
              // Format: 99YYYYMMDDHHMMSS where YYYY is year, MM is month, DD is day, HH is hour, MM is minute, SS is second
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
          .filter((user) => user.name); // Filter rows that have at least a name

        // Convert to CSV using original Syntegra headers for backend compatibility
        const csvData = parsedUsers.map((user) => {
          const csvRow: any = {};

          // Map back to original Syntegra column names for backend processing
          Object.entries(DEFAULT_COLUMN_MAPPING).forEach(
            ([field, originalHeader]) => {
              csvRow[originalHeader] = user[field as keyof ParsedUser] || "";
            }
          );

          return csvRow;
        });

        const csvContent = Papa.unparse(csvData, {
          header: true,
        });

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

        // Show warning if many emails were generated
        const generatedEmails = parsedUsers.filter(
          (u) => u.email && u.email.includes("@syntegra.com")
        ).length;
        if (generatedEmails > 0) {
          toast.info(
            `${generatedEmails} email otomatis di-generate untuk karyawan yang tidak memiliki email`
          );
        }
      } catch (error) {
        console.error("Error parsing file:", error);

        // Enhanced error logging for debugging
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
          });
        }

        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Gagal memparse file Excel",
          isLoading: false,
        }));

        // Enhanced error notification with actionable guidance
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        toast.error("Gagal memparse file Excel", {
          description: `${errorMsg}. Periksa apakah file memiliki header NAMA, NIK KTP, EMAIL, dan kolom lainnya di salah satu baris 1-10.`,
          duration: 10000, // Show longer for user to read
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
    } catch (error) {
      console.error("Submit error:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Gagal mengimport data",
        isLoading: false,
      }));
      toast.error("Gagal mengimport data");
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

  // Download template - updated to match actual Excel structure
  const handleDownloadTemplate = () => {
    const templateData = [
      // Row 1-4: Title and company info (optional, for formatting)
      {},
      {},
      { "": "", "DATA KARYAWAN": "DATA KARYAWAN" },
      { "": "", "PT. SYNTEGRA WIRA SRIWIJAYA": "PT. SYNTEGRA WIRA SRIWIJAYA" },
      // Row 5: Headers (actual header row)
      {
        "": "",
        NO: "NO",
        "ID KARYAWAN": "ID KARYAWAN",
        NAMA: "NAMA",
        JABATAN: "JABATAN",
        DIVISI: "DIVISI",
        CABANG: "CABANG",
        "KODE CABANG": "KODE CABANG",
        "JENIS KARYAWAN": "JENIS KARYAWAN",
        TMK: "TMK",
        SEX: "SEX",
        "NIK KTP": "NIK KTP",
        "TEMPAT LAHIR": "TEMPAT LAHIR",
        "TANGGAL LAHIR": "TANGGAL LAHIR",
        "ALAMAT KTP": "ALAMAT KTP",
        "STATUS PERNIKAHAN": "STATUS PERNIKAHAN",
        AGAMA: "AGAMA",
        "PENDIDIKAN TERAKHIR": "PENDIDIKAN TERAKHIR",
        "NOMOR HP": "NOMOR HP",
        "NAMA IBU KANDUNG": "NAMA IBU KANDUNG",
        NPWP: "NPWP",
        "E-MAIL": "E-MAIL",
      },
      // Row 6: Sample data
      {
        "": "",
        NO: "1",
        "ID KARYAWAN": "O-31-010724-00001",
        NAMA: "John Doe",
        JABATAN: "Staff",
        DIVISI: "IT",
        CABANG: "HEAD OFFICE",
        "KODE CABANG": "31",
        "JENIS KARYAWAN": "ORGANIK",
        TMK: "45474",
        SEX: "L",
        "NIK KTP": "1234567890123456",
        "TEMPAT LAHIR": "Jakarta",
        "TANGGAL LAHIR": "1990-01-01",
        "ALAMAT KTP": "Jl. Example No. 123",
        "STATUS PERNIKAHAN": "BELUM KAWIN",
        AGAMA: "ISLAM",
        "PENDIDIKAN TERAKHIR": "S1",
        "NOMOR HP": "081234567890",
        "NAMA IBU KANDUNG": "Jane Doe",
        NPWP: "123456789012345",
        "E-MAIL": "john.doe@syntegra.com",
      },
    ];

    // Create workbook with proper structure
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData, { skipHeader: true });

    // Set column widths for better visibility
    ws["!cols"] = [
      { width: 5 }, // Empty column
      { width: 5 }, // NO
      { width: 20 }, // ID KARYAWAN
      { width: 25 }, // NAMA
      { width: 20 }, // JABATAN
      { width: 15 }, // DIVISI
      { width: 15 }, // CABANG
      { width: 12 }, // KODE CABANG
      { width: 15 }, // JENIS KARYAWAN
      { width: 10 }, // TMK
      { width: 8 }, // SEX
      { width: 18 }, // NIK KTP
      { width: 15 }, // TEMPAT LAHIR
      { width: 15 }, // TANGGAL LAHIR
      { width: 30 }, // ALAMAT KTP
      { width: 18 }, // STATUS PERNIKAHAN
      { width: 12 }, // AGAMA
      { width: 20 }, // PENDIDIKAN TERAKHIR
      { width: 15 }, // NOMOR HP
      { width: 20 }, // NAMA IBU KANDUNG
      { width: 18 }, // NPWP
      { width: 25 }, // E-MAIL
    ];

    XLSX.utils.book_append_sheet(wb, ws, "DB");
    XLSX.writeFile(wb, "template_syntegra_karyawan.xlsx");
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
            Download Template Excel
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
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
