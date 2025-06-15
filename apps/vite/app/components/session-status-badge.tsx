import { CheckCircle, Edit, Play, XCircle } from "lucide-react";
import { getSessionStatusInfo } from "~/lib/utils/session";
import { Badge } from "./ui/badge";

export const SessionStatusBadge = ({ session }: { session: any }) => {
  try {
    const statusInfo = getSessionStatusInfo(
      session.start_time,
      session.end_time
    );

    const iconMap = {
      draft: <Edit className="h-3 w-3" />,
      active: <Play className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />,
    };

    const variantMap = {
      draft: "outline" as const,
      active: "default" as const,
      completed: "secondary" as const,
    };

    const colorMap = {
      draft: "text-gray-700",
      active: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
    };

    return (
      <Badge
        variant={variantMap[statusInfo.status]}
        className={`gap-1 ${colorMap[statusInfo.status]}`}
        title={statusInfo.description}
      >
        {iconMap[statusInfo.status]}
        {statusInfo.label}
      </Badge>
    );
  } catch (error) {
    console.error("Error getting status badge:", error);
    return (
      <Badge variant="outline" className="gap-1">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
};
