import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Session } from "~/hooks/use-sessions";

interface TabParticipantProps {
  session: Session;
}

export const TabParticipant = ({ session }: TabParticipantProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Peserta Session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Fitur manajemen peserta akan segera hadir</p>
          <p className="text-sm">
            Saat ini terdapat {session.current_participants} peserta terdaftar
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
