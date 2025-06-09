import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Users, UserCheck } from "lucide-react";
import type { GetUsersResponse } from "~/hooks/use-users";

interface User {
  id: string;
  role: string;
  is_active: boolean;
}

interface UsersData {
  users: User[];
}

interface CardAnalyticUserProps {
  usersData?: GetUsersResponse;
  isLoading: boolean;
}

export function CardAnalyticUser({
  usersData,
  isLoading,
}: CardAnalyticUserProps) {
  // Calculate analytics from data
  const analytics = useMemo(() => {
    if (!usersData?.data) {
      return {
        totalUsers: 0,
        totalParticipants: 0,
        totalAdmins: 0,
        activeUsers: 0,
      };
    }

    const users = usersData.data;
    return {
      totalUsers: users.length,
      totalParticipants: users.filter((user) => user.role === "participant")
        .length,
      totalAdmins: users.filter((user) => user.role === "admin").length,
      activeUsers: users.filter((user) => user.is_active).length,
    };
  }, [usersData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? <LoadingSpinner size="sm" /> : analytics.totalUsers}
          </div>
          <p className="text-xs text-muted-foreground">
            Total pengguna terdaftar
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Admin</CardTitle>
          <UserCheck className="size-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {isLoading ? <LoadingSpinner size="sm" /> : analytics.totalAdmins}
          </div>
          <p className="text-xs text-muted-foreground">Administrator sistem</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peserta</CardTitle>
          <Users className="size-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              analytics.totalParticipants
            )}
          </div>
          <p className="text-xs text-muted-foreground">Peserta tes terdaftar</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User Aktif</CardTitle>
          <UserCheck className="size-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {isLoading ? <LoadingSpinner size="sm" /> : analytics.activeUsers}
          </div>
          <p className="text-xs text-muted-foreground">
            User dengan status aktif
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
