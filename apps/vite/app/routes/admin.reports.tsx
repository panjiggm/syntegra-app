import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { BulkExportManager } from "~/components/admin/reports";

import { Download } from "lucide-react";
import type { Route } from "./+types/admin.reports";
import { useTestResultsReport } from "~/hooks/use-test-results-report";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Laporan - Admin Syntegra Psikotes" },
    { name: "description", content: "Kelola dan generate laporan psikotes" },
  ];
}

export default function AdminReports() {
  return <ReportsContent />;
}

function ReportsContent() {
  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat dan analisa hasil laporan psikotes
          </p>
        </div>
      </div>

      {/* Main Reports Content */}
      <div className="space-y-6">
        {/* Bulk Export Manager - Main Feature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Laporan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Export laporan berdasarkan periode atau pilih data spesifik
            </p>
          </CardHeader>
          <CardContent>
            <BulkExportManager />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
