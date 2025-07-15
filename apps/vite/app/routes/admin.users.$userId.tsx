import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import { useAuth } from "~/contexts/auth-context";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import { HeaderUserDetail } from "~/components/admin/users-detail/HeaderUserDetail";
import { ProfileHeaderCard } from "~/components/admin/users-detail/ProfileHeaderCard";
import { TabNavigation } from "~/components/admin/users-detail/TabNavigation";
import { TabContent } from "~/components/admin/users-detail/TabContent";
import { DialogDeleteUser } from "~/components/admin/users/DialogDeleteUser";
import { useUsersStore } from "~/stores/use-users-store";
import type { Route } from "./+types/admin.users.$userId";

// Types based on API response
interface UserProfile {
  id: string;
  nik: string;
  name: string;
  email: string;
  profile_picture_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login: string | null;
}

interface PersonalInfo {
  phone: string;
  gender: "male" | "female" | "other";
  birth_place: string | null;
  birth_date: string | null;
  age: number | null;
  religion: string | null;
  education: string | null;
  address: {
    full_address: string | null;
    province: string | null;
    regency: string | null;
    district: string | null;
    village: string | null;
    postal_code: string | null;
  };
}

interface TestSession {
  id: string;
  session_name: string;
  session_code: string;
  start_time: string;
  end_time: string;
  status: string;
  participant_status: string;
  score?: number;
  completion_percentage?: number;
}

interface TestAttempt {
  id: string;
  test_name: string;
  test_category: string;
  module_type: string;
  attempt_date: string;
  duration_minutes: number;
  status: string;
  raw_score?: number;
  scaled_score?: number;
  percentile?: number;
  grade?: string;
  is_passed?: boolean;
}

interface TestResult {
  test_name: string;
  category: string;
  traits: Array<{
    name: string;
    score: number;
    description: string;
    category: string;
  }>;
  recommendations: string[];
  detailed_analysis: any;
}

interface TestStatistics {
  total_sessions: number;
  completed_sessions: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  total_time_spent_minutes: number;
  completion_rate: number;
  categories_attempted: string[];
}

interface PerformanceByCategory {
  category: string;
  attempts: number;
  average_score: number;
  best_score: number;
  completion_rate: number;
}

interface PsychotestHistory {
  sessions: TestSession[];
  attempts: TestAttempt[];
  results_analysis: TestResult[];
  statistics: TestStatistics;
  performance_by_category: PerformanceByCategory[];
}

interface UserDetailResponse {
  success: boolean;
  message: string;
  data: {
    profile: UserProfile;
    personal_info: PersonalInfo;
    psychotest_history: PsychotestHistory | null;
  };
  timestamp: string;
}

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Detail User - Syntegra Psikotes` },
    { name: "description", content: "Detail informasi pengguna sistem" },
  ];
}

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { openDeleteUserModal } = useUsersStore();
  const [activeTab, setActiveTab] = useState<"profile" | "tests" | "analysis">(
    "profile"
  );

  const {
    data: userDetail,
    isLoading,
    error,
    refetch,
  } = useQuery<UserDetailResponse["data"]>({
    queryKey: ["user-detail", userId],
    queryFn: async () => {
      const response = await apiClient.get<UserDetailResponse>(
        `/users/${userId}/details`
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch user details");
      }
      return response.data;
    },
    enabled: !!userId,
    retry: 2,
  });

  // Check authorization
  if (!hasRole("admin")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view user details.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-xl font-semibold">Gagal memuat detail user</h2>
        <p className="text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat data"}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  const { profile, personal_info, psychotest_history } = userDetail;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <HeaderUserDetail
        onBack={() => navigate("/admin/users")}
        onRefresh={() => refetch()}
        onDelete={(userId, userName) => openDeleteUserModal(userId, userName)}
        userId={profile.id}
        userName={profile.name}
        isLoading={isLoading}
      />

      {/* Profile Header Card */}
      <ProfileHeaderCard profile={profile} personalInfo={personal_info} />

      {/* Main Content with Sidebar Layout */}
      <div className="flex flex-1 gap-6">
        {/* Tab Navigation - Sidebar */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          psychotestHistory={psychotest_history}
        />

        {/* Tab Content - Main Content */}
        <div className="flex-1 min-w-0">
          <TabContent
            activeTab={activeTab}
            personalInfo={personal_info}
            psychotestHistory={psychotest_history}
          />
        </div>
      </div>

      {/* Delete User Dialog */}
      <DialogDeleteUser />
    </div>
  );
}
