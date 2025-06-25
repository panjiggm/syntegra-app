import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Eye, CheckCircle, AlertTriangle } from "lucide-react";

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
}

interface BulkImportPreviewProps {
  data: ParsedUser[];
  onValidate: () => void;
  isLoading: boolean;
}

export function BulkImportPreview({
  data,
  onValidate,
  isLoading,
}: BulkImportPreviewProps) {
  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? data : data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview Data ({data.length} records)
        </CardTitle>
        <CardDescription>
          Periksa data yang akan diimport sebelum melanjutkan proses validasi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-lg font-semibold text-blue-600">
              {data.length}
            </div>
            <div className="text-sm text-blue-600">Total Data</div>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-lg font-semibold text-green-600">
              {data.filter((u) => u.nik && u.name && u.email).length}
            </div>
            <div className="text-sm text-green-600">Data Lengkap</div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="text-lg font-semibold text-yellow-600">
              {data.filter((u) => !u.nik || !u.name || !u.email).length}
            </div>
            <div className="text-sm text-yellow-600">Data Tidak Lengkap</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="text-lg font-semibold text-purple-600">
              {new Set(data.map((u) => u.email)).size}
            </div>
            <div className="text-sm text-purple-600">Unik Email</div>
          </div>
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-lg font-semibold text-orange-600">
              {
                data.filter((u) => u.email && u.email.includes("@syntegra.com"))
                  .length
              }
            </div>
            <div className="text-sm text-orange-600">Generated Emails</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((user) => {
                  const isComplete = user.nik && user.name && user.email;
                  return (
                    <TableRow key={user.row_number}>
                      <TableCell className="font-mono text-sm">
                        {user.row_number}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.nik || <span className="text-red-500">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.name || <span className="text-red-500">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.email || <span className="text-red-500">-</span>}
                      </TableCell>
                      <TableCell>
                        {user.gender ? (
                          <Badge variant="outline">{user.gender}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.phone ? (
                          <span className="text-sm">{user.phone}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isComplete ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Show More/Less */}
        {data.length > 10 && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show Less" : `Show All (${data.length - 10} more)`}
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button onClick={onValidate} disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner className="h-4 w-4 mr-2" />
                Memvalidasi...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validasi Data
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
