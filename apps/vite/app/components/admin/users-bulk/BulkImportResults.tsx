import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  RefreshCw,
  Eye,
} from "lucide-react";

interface BulkImportResult {
  success: boolean;
  message: string;
  data: {
    total_processed: number;
    successful: number;
    failed: number;
    skipped: number;
    results: Array<{
      row_number?: number;
      nik: string;
      name: string;
      email: string;
      status: "success" | "error" | "skipped";
      user_data?: any;
      error?: {
        field?: string;
        message: string;
        code?: string;
      };
    }>;
    summary: {
      duplicates_found: number;
      validation_errors: number;
      database_errors: number;
    };
  };
  timestamp: string;
}

interface BulkImportResultsProps {
  result: BulkImportResult;
  onReset: () => void;
  onViewUsers: () => void;
}

export function BulkImportResults({
  result,
  onReset,
  onViewUsers,
}: BulkImportResultsProps) {
  const { data } = result;
  const successfulResults = data.results.filter((r) => r.status === "success");
  const failedResults = data.results.filter((r) => r.status === "error");
  const skippedResults = data.results.filter((r) => r.status === "skipped");

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Import selesai!</strong> {data.successful} dari{" "}
          {data.total_processed} users berhasil ditambahkan.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{data.total_processed}</div>
                <div className="text-sm text-muted-foreground">
                  Total Processed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {data.successful}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {data.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {data.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      {(failedResults.length > 0 || skippedResults.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              Details untuk records yang failed atau skipped
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Failed Results */}
              {failedResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">
                    Failed Records ({failedResults.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedResults.slice(0, 10).map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.row_number}</TableCell>
                            <TableCell>{result.name}</TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell>
                              <span className="text-red-600 text-sm">
                                {result.error?.message || "Unknown error"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {failedResults.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ... dan {failedResults.length - 10} error lainnya
                    </p>
                  )}
                </div>
              )}

              {/* Skipped Results */}
              {skippedResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600 mb-2">
                    Skipped Records ({skippedResults.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {skippedResults.slice(0, 5).map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.row_number}</TableCell>
                            <TableCell>{result.name}</TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-yellow-600"
                              >
                                {result.error?.message || "Duplicate"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {skippedResults.length > 5 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ... dan {skippedResults.length - 5} skipped records
                      lainnya
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Import Lagi
        </Button>
        <Button onClick={onViewUsers}>
          <Eye className="h-4 w-4 mr-2" />
          Lihat Semua Users
        </Button>
      </div>
    </div>
  );
}
