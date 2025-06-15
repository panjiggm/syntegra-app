import { useState, useMemo } from "react";

// Components
import { HeaderSessions } from "~/components/admin/sessions/HeaderSessions";
import { FilterSessions } from "~/components/admin/sessions/FilterSessions";
import { CardAnalyticSessions } from "~/components/admin/sessions/CardAnalyticSessions";
import { TableSessions } from "~/components/admin/sessions/TableSessions";
import { MiniCalendar } from "~/components/admin/sessions/MiniCalendar";
import { UpcomingSessions } from "~/components/admin/sessions/UpcomingSessions";
import { DialogCreateSession } from "~/components/admin/sessions/DialogCreateSession";

// Hooks and Stores
import { useSessions } from "~/hooks/use-sessions";

// Utils
import { toast } from "sonner";
import { isSameLocalDate } from "~/lib/utils/date";
import { DialogDeleteSession } from "~/components/admin/session/DialogDeleteSession";

export function meta() {
  return [
    { title: "Manajemen Sessions - Syntegra Psikotes" },
    { name: "description", content: "Kelola sesi tes psikologi" },
  ];
}

interface GetSessionsRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  target_position?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export default function AdminSessionsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter states
  const [filters, setFilters] = useState<GetSessionsRequest>({
    page: 1,
    limit: 10,
    search: "",
    status: undefined,
    target_position: undefined,
    sort_by: "start_time",
    sort_order: "desc",
  });

  // Use sessions hooks
  const { useGetSessions, useGetSessionStats } = useSessions();

  const {
    data: sessionsResponse,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useGetSessions(filters);

  const {
    data: statsResponse,
    isLoading: statsLoading,
    error: statsError,
  } = useGetSessionStats();

  // Handle filter changes
  const updateFilter = (key: keyof GetSessionsRequest, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value,
    }));
  };

  // Statistics from API or defaults
  const stats = useMemo(() => {
    if (statsError) {
      console.error("Stats API error:", statsError);
      return { today: 0, ongoing: 0, upcoming: 0, thisWeek: 0 };
    }

    if (statsResponse?.summary) {
      const data = statsResponse.summary;

      const totalSessions = data?.total_sessions || 0;
      const activeSessions = data?.active_sessions || 0;
      const completedSessions = data?.completed_sessions || 0;
      const cancelledSessions = data?.cancelled_sessions || 0;

      return {
        today: activeSessions, // Currently active sessions (use as today for now)
        ongoing: activeSessions, // Currently active sessions
        upcoming: Math.max(
          0,
          totalSessions - completedSessions - cancelledSessions - activeSessions
        ),
        thisWeek: totalSessions, // Total sessions (use as thisWeek for now)
      };
    }

    return { today: 0, ongoing: 0, upcoming: 0, thisWeek: 0 };
  }, [statsResponse, statsError]);

  // Filter sessions by selected date
  const filteredSessions = useMemo(() => {
    if (!sessionsResponse?.data) return [];

    return sessionsResponse.data.filter((session: any) => {
      return isSameLocalDate(session.start_time, selectedDate);
    });
  }, [sessionsResponse, selectedDate]);

  // All sessions for upcoming component
  const allSessions = useMemo(() => {
    if (!sessionsResponse?.data) return [];
    return sessionsResponse.data;
  }, [sessionsResponse]);

  const handleCopyLink = (sessionCode: string) => {
    const link = `${window.location.origin}/session/${sessionCode}`;
    navigator.clipboard.writeText(link);

    toast.success("Link berhasil disalin!", {
      description: "Link partisipan telah disalin ke clipboard",
    });
  };

  const handlePageChange = (page: number) => {
    updateFilter("page", page);
  };

  const handleRefresh = () => {
    refetchSessions();
  };

  if (sessionsLoading && !sessionsResponse) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header Section */}
      <HeaderSessions isLoading={sessionsLoading} onRefresh={handleRefresh} />

      {/* Statistics Cards */}
      <CardAnalyticSessions stats={stats} isLoading={statsLoading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Side - Sessions List (8 columns) */}
        <div className="md:col-span-8 space-y-4">
          {/* Filters */}
          <FilterSessions filters={filters} onFilterChange={updateFilter} />

          {/* Sessions Table */}
          <TableSessions
            sessions={filteredSessions}
            isLoading={sessionsLoading}
            error={sessionsError}
            selectedDate={selectedDate}
            sessionsResponse={sessionsResponse}
            onRefetch={handleRefresh}
            onPageChange={handlePageChange}
            onCopyLink={handleCopyLink}
          />
        </div>

        {/* Right Side - Calendar & Info (4 columns) */}
        <div className="md:col-span-4 space-y-4">
          <MiniCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />

          {/* Upcoming Sessions */}
          <UpcomingSessions
            sessions={allSessions}
            isLoading={sessionsLoading}
          />
        </div>
      </div>

      {/* Create/Edit Session Dialog */}
      <DialogCreateSession />
      <DialogDeleteSession />
    </div>
  );
}
