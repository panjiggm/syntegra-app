import {
  Calendar,
  Clock,
  Edit,
  MapPin,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Session } from "~/hooks/use-sessions";
import { formatDateTime, formatTime } from "~/lib/utils/date";

interface TabOverviewProps {
  session: Session;
}

export const TabOverview = ({ session }: TabOverviewProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Waktu Pelaksanaan</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(session.start_time)} -{" "}
                {formatTime(session.end_time)}
              </p>
            </div>
          </div>

          {session.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Lokasi</p>
                <p className="text-sm text-muted-foreground">
                  {session.location}
                </p>
              </div>
            </div>
          )}

          {session.description && (
            <div>
              <p className="font-medium mb-2">Deskripsi</p>
              <p className="text-sm text-muted-foreground">
                {session.description}
              </p>
            </div>
          )}

          {session.time_remaining && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Waktu Tersisa</p>
                <p className="text-sm text-muted-foreground">
                  {session.time_remaining}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* People Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Tim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.proctor && (
            <div className="flex items-center gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Proktor</p>
                <p className="text-sm text-muted-foreground">
                  {session.proctor.name} ({session.proctor.email})
                </p>
              </div>
            </div>
          )}

          {session.created_by_user && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Dibuat oleh</p>
                <p className="text-sm text-muted-foreground">
                  {session.created_by_user.name} •{" "}
                  {formatDateTime(session.created_at)}
                </p>
              </div>
            </div>
          )}

          {session.updated_by_user &&
            session.updated_by_user.id !== session.created_by_user?.id && (
              <div className="flex items-center gap-3">
                <Edit className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Terakhir diubah</p>
                  <p className="text-sm text-muted-foreground">
                    {session.updated_by_user.name} •{" "}
                    {formatDateTime(session.updated_at)}
                  </p>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
