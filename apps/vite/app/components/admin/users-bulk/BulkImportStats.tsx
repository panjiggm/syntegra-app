import { Card, CardContent } from "~/components/ui/card";
import { Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface BulkImportStatsProps {
  stats: {
    total?: number;
    successful?: number;
    failed?: number;
    skipped?: number;
    valid?: number;
    errors?: number;
    warnings?: number;
  };
}

export function BulkImportStats({ stats }: BulkImportStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total */}
      {stats.total !== undefined && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">
                  Total Records
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success/Valid */}
      {(stats.successful !== undefined || stats.valid !== undefined) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {stats.successful || stats.valid}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.successful !== undefined ? "Successful" : "Valid"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed/Errors */}
      {(stats.failed !== undefined || stats.errors !== undefined) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">
                  {stats.failed || stats.errors}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.failed !== undefined ? "Failed" : "Errors"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skipped/Warnings */}
      {(stats.skipped !== undefined || stats.warnings !== undefined) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-600">
                  {stats.skipped || stats.warnings}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.skipped !== undefined ? "Skipped" : "Warnings"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
