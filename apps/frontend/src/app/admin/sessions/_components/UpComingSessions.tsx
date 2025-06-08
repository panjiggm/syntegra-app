import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingSessionsProps {
  sessions: any[];
  isLoading: boolean;
}

export const UpcomingSessions = ({
  sessions,
  isLoading,
}: UpcomingSessionsProps) => {
  // Early return for loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jadwal Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 p-2 rounded-lg border">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format time for display
  const formatTime = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return format(dateObj, "HH:mm", { locale: id });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "--:--";
    }
  };

  // Format date for display
  const formatDate = (date: string | Date) => {
    try {
      const dateObj = typeof date === "string" ? parseISO(date) : date;
      return format(dateObj, "dd MMM yyyy", { locale: id });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const upcomingSessions = sessions
    .filter((s) => s.status === "active" || s.status === "draft")
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jadwal Mendatang</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-2 rounded-lg border"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium truncate">
                    {session.session_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(session.start_time)} •{" "}
                    {formatTime(session.start_time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Tidak ada jadwal mendatang
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
