"use client";

import { useState, useMemo } from "react";
import { useSessionStore } from "@/stores/useSessionStore";

// Components
import { HeaderSessions } from "./_components/HeaderSessions";
import { FilterSessions } from "./_components/FilterSessions";
import { CardAnalyticSessions } from "./_components/CardAnalyticSessions";
import { TableSessions } from "./_components/TableSessions";
import { MiniCalendar } from "./_components/MiniCalendar";
import { UpcomingSessions } from "./_components/UpComingSessions";
// import { CreateSessionDialog } from "./_components/CreateSessionDialog";

// Hooks
import { useSessions, sessionHelpers } from "@/hooks/useSessions";
import type { GetSessionsRequest } from "shared-types";

export default function SessionsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { openCreateSession } = useSessionStore();

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

  // Use sessions hook
  const sessionsLoading = false;
  const statsLoading = false;
  const sessionsResponse: any = { success: true, data: [] };
  const statsResponse: any = { success: true, data: { summary: {} } };
  const sessionsError = null;
  const statsError = null;

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

    if (statsResponse?.success && statsResponse.data?.summary) {
      const data = statsResponse.data.summary;

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
    if (!sessionsResponse?.success || !sessionsResponse.data) return [];

    const selectedDateString = selectedDate.toISOString().split("T")[0];

    return sessionsResponse.data.filter((session: any) => {
      const sessionDate = new Date(session.start_time)
        .toISOString()
        .split("T")[0];
      return sessionDate === selectedDateString;
    });
  }, [sessionsResponse, selectedDate]);

  // All sessions for upcoming component
  const allSessions = useMemo(() => {
    if (!sessionsResponse?.success || !sessionsResponse.data) return [];
    return sessionsResponse.data;
  }, [sessionsResponse]);

  // Action handlers
  const handleEdit = (sessionId: string) => {
    console.log("Edit session:", sessionId);
    // Navigate to edit page or open edit modal
  };

  const handleDelete = (sessionId: string) => {
    console.log("Delete session:", sessionId);
    // Open delete confirmation modal
  };

  const handleViewDetails = (sessionId: string) => {
    console.log("View details:", sessionId);
    // Navigate to session details page
  };

  const handleCopyLink = (sessionCode: string) => {
    const link = sessionHelpers.generateParticipantLink(sessionCode);
    navigator.clipboard.writeText(link);
    // Show toast notification
    console.log("Link copied:", link);
  };

  const handlePageChange = (page: number) => {
    updateFilter("page", page);
  };

  if (sessionsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header Section */}
      <HeaderSessions isLoading={sessionsLoading} onRefresh={() => {}} />

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
            onRefetch={() => {}}
            onNewSession={openCreateSession}
            onPageChange={handlePageChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
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

      {/* Create Session Dialog */}
      {/* <CreateSessionDialog /> */}
    </div>
  );
}
