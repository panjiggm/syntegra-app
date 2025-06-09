import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Mail, Phone } from "lucide-react";

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

interface ProfileHeaderCardProps {
  profile: UserProfile;
  personalInfo: PersonalInfo;
}

export function ProfileHeaderCard({
  profile,
  personalInfo,
}: ProfileHeaderCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Tidak diketahui";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Tidak pernah";
    return new Date(dateStr).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="relative">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">
              <Badge variant={profile.is_active ? "default" : "secondary"}>
                {profile.is_active ? "Aktif" : "Tidak Aktif"}
              </Badge>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.name}
                </h2>
                <p className="text-muted-foreground">NIK: {profile.nik}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Mail className="size-4" />
                    {profile.email}
                  </div>
                  {personalInfo.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="size-4" />
                      {personalInfo.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={profile.email_verified ? "default" : "destructive"}
                >
                  {profile.email_verified
                    ? "Email Verified"
                    : "Email Not Verified"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Bergabung</p>
                <p className="font-medium">{formatDate(profile.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Login Terakhir</p>
                <p className="font-medium">
                  {formatDateTime(profile.last_login)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {profile.is_active ? "Aktif" : "Tidak Aktif"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
