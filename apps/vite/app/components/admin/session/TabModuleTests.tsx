import { BookOpen } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Session } from "~/hooks/use-sessions";

interface TabModuleTestsProps {
  session: Session;
}

export const TabModuleTests = ({ session }: TabModuleTestsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Modul Tes ({session.session_modules?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {session.session_modules && session.session_modules.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Urutan</TableHead>
                  <TableHead>Nama Tes</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Soal</TableHead>
                  <TableHead>Bobot</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.session_modules
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((module) => (
                    <TableRow key={module.id}>
                      <TableCell>
                        <Badge variant="outline">{module.sequence}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {module.test.icon && (
                            <span className="text-lg">{module.test.icon}</span>
                          )}
                          <div>
                            <div className="font-medium">
                              {module.test.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {module.test.module_type}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {module.test.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{module.test.time_limit} menit</TableCell>
                      <TableCell>{module.test.total_questions} soal</TableCell>
                      <TableCell>{module.weight}x</TableCell>
                      <TableCell>
                        {module.is_required ? (
                          <Badge className="bg-red-100 text-red-700">
                            Wajib
                          </Badge>
                        ) : (
                          <Badge variant="outline">Opsional</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada modul tes yang ditambahkan</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
