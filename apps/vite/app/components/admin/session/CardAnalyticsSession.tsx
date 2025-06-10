import { BookOpen, Target, Timer, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Session } from "~/hooks/use-sessions";

interface CardAnalyticsSessionProps {
  session: Session;
}

export const CardAnalyticsSession = ({
  session,
}: CardAnalyticsSessionProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Durasi Session</CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {session.session_duration_hours} Jam
          </div>
          <p className="text-xs text-muted-foreground">
            {session.total_test_time_minutes} menit total tes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Soal</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {session.total_questions}
          </div>
          <p className="text-xs text-muted-foreground">
            {session.session_modules?.length || 0} modul tes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peserta</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {session.current_participants}
            {session.max_participants && `/${session.max_participants}`}
          </div>
          <p className="text-xs text-muted-foreground">
            {session.max_participants ? "Terbatas" : "Tidak terbatas"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Posisi Target</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {session.target_position || "Umum"}
          </div>
          <p className="text-xs text-muted-foreground">Target kandidat</p>
        </CardContent>
      </Card>
    </div>
  );
};
