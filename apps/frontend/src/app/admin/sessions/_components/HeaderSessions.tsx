import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useSessionStore } from "@/stores/useSessionStore";
import { Skeleton } from "@/components/ui/skeleton";

interface HeaderSessionsProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export const HeaderSessions = ({
  isLoading,
  onRefresh,
}: HeaderSessionsProps) => {
  const { openCreateSession } = useSessionStore();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Jadwal & Sesi Psikotes
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Kelola jadwal tes psikotes, atur sesi evaluasi, dan pantau kehadiran
          peserta dengan sistem penjadwalan yang terintegrasi.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button onClick={openCreateSession} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Jadwal Baru
        </Button>
      </div>
    </div>
  );
};
