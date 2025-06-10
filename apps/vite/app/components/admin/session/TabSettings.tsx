import { CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { Session } from "~/hooks/use-sessions";

interface TabSettingsProps {
  session: Session;
}

export const TabSettings = ({ session }: TabSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kadaluarsa Otomatis</label>
            <div className="flex items-center gap-2">
              {session.auto_expire ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">
                {session.auto_expire ? "Aktif" : "Tidak Aktif"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Izinkan Masuk Terlambat
            </label>
            <div className="flex items-center gap-2">
              {session.allow_late_entry ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">
                {session.allow_late_entry ? "Diizinkan" : "Tidak Diizinkan"}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-sm font-medium">Session ID</label>
          <code className="block p-2 bg-gray-100 rounded text-sm font-mono">
            {session.id}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};
