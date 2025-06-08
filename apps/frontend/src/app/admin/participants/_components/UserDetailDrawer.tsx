"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  TrendingUp,
  Award,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  BarChart3,
  Users,
  Brain,
  Loader2,
  X,
} from "lucide-react";
import { useUserDetail, userDetailHelpers } from "@/hooks/useUserDetail";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName?: string;
}

export function UserDetailDrawer({
  isOpen,
  onClose,
  userId,
}: UserDetailDrawerProps) {
  const { useGetUserDetail } = useUserDetail();
  const { data: userDetail, isLoading, error } = useGetUserDetail(userId || "");

  if (!userId) return null;

  const data = userDetail?.data;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="mx-auto w-full max-w-4xl max-h-[96vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-xl font-bold">
                Detail Peserta
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                Informasi lengkap dan riwayat psikotes peserta
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">Memuat detail peserta...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-red-600">
                    Gagal memuat detail peserta
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Terjadi kesalahan saat mengambil data peserta
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <User className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Data peserta tidak ditemukan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Peserta dengan ID tersebut tidak tersedia
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profil Peserta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={data.profile.profile_picture_url || ""}
                      />
                      <AvatarFallback className="text-xl font-bold">
                        {data.profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold">
                          {data.profile.name}
                        </h3>
                        <p className="text-muted-foreground">
                          NIK: {data.profile.nik || "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            data.profile.is_active ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {data.profile.is_active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                        <Badge
                          variant={
                            data.profile.email_verified ? "default" : "outline"
                          }
                          className="text-xs"
                        >
                          {data.profile.email_verified
                            ? "✓ Terverifikasi"
                            : "⚠ Belum Terverifikasi"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium block">Email:</span>
                          <span className="text-muted-foreground truncate block">
                            {data.profile.email}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="font-medium block">Telepon:</span>
                          <span className="text-muted-foreground">
                            {data.personal_info.phone || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="font-medium block">
                            Jenis Kelamin:
                          </span>
                          <span className="text-muted-foreground">
                            {userDetailHelpers.formatGender(
                              data.personal_info.gender
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="font-medium block">Usia:</span>
                          <span className="text-muted-foreground">
                            {data.personal_info.age
                              ? `${data.personal_info.age} tahun`
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="font-medium block">Agama:</span>
                          <span className="text-muted-foreground">
                            {userDetailHelpers.formatReligion(
                              data.personal_info.religion
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <span className="font-medium block">Pendidikan:</span>
                          <span className="text-muted-foreground">
                            {userDetailHelpers.formatEducation(
                              data.personal_info.education
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium block">Alamat:</span>
                        <p className="text-muted-foreground mt-1 break-words">
                          {userDetailHelpers.formatAddress(
                            data.personal_info.address
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Terdaftar:</span>
                      <br />
                      {format(
                        new Date(data.profile.created_at),
                        "dd MMM yyyy, HH:mm",
                        { locale: id }
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Login Terakhir:</span>
                      <br />
                      {data.profile.last_login
                        ? format(
                            new Date(data.profile.last_login),
                            "dd MMM yyyy, HH:mm",
                            { locale: id }
                          )
                        : "Belum pernah login"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Psychotest History Section */}
              {data.psychotest_history && (
                <>
                  {/* Statistics Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Statistik Psikotes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">
                            {data.psychotest_history.statistics.total_sessions}
                          </div>
                          <div className="text-sm text-blue-800 mt-1">
                            Total Sesi
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">
                            {
                              data.psychotest_history.statistics
                                .completed_attempts
                            }
                          </div>
                          <div className="text-sm text-green-800 mt-1">
                            Tes Selesai
                          </div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-600">
                            {data.psychotest_history.statistics.average_score.toFixed(
                              1
                            )}
                          </div>
                          <div className="text-sm text-purple-800 mt-1">
                            Rata-rata Skor
                          </div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <div className="text-3xl font-bold text-orange-600">
                            {userDetailHelpers.formatDuration(
                              data.psychotest_history.statistics
                                .total_time_spent_minutes
                            )}
                          </div>
                          <div className="text-sm text-orange-800 mt-1">
                            Total Waktu
                          </div>
                        </div>
                      </div>

                      {data.psychotest_history.statistics.completion_rate >
                        0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium">
                              Tingkat Penyelesaian:
                            </span>
                            <span className="font-bold text-green-600">
                              {
                                data.psychotest_history.statistics
                                  .completion_rate
                              }
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-green-600 h-3 rounded-full transition-all duration-500"
                              style={{
                                width: `${data.psychotest_history.statistics.completion_rate}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Performance by Category */}
                  {data.psychotest_history.performance_by_category.length >
                    0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Performa per Kategori
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.psychotest_history.performance_by_category.map(
                          (category, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge
                                  className={userDetailHelpers.getCategoryColor(
                                    category.category
                                  )}
                                >
                                  {category.category.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {category.attempts} percobaan
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                  <span className="text-muted-foreground block">
                                    Rata-rata
                                  </span>
                                  <div className="text-lg font-bold mt-1">
                                    {category.average_score.toFixed(1)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground block">
                                    Terbaik
                                  </span>
                                  <div className="text-lg font-bold text-green-600 mt-1">
                                    {category.best_score.toFixed(1)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground block">
                                    Selesai
                                  </span>
                                  <div className="text-lg font-bold mt-1">
                                    {category.completion_rate.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Test Sessions */}
                  {data.psychotest_history.sessions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Riwayat Sesi Tes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.psychotest_history.sessions.map(
                          (session, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium truncate">
                                    {session.session_name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    Kode: {session.session_code}
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    userDetailHelpers.getStatusBadge(
                                      session.status
                                    ).className
                                  }
                                >
                                  {
                                    userDetailHelpers.getStatusBadge(
                                      session.status
                                    ).label
                                  }
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Mulai:
                                  </span>
                                  <div className="font-medium">
                                    {format(
                                      new Date(session.start_time),
                                      "dd MMM yyyy, HH:mm",
                                      { locale: id }
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Selesai:
                                  </span>
                                  <div className="font-medium">
                                    {format(
                                      new Date(session.end_time),
                                      "dd MMM yyyy, HH:mm",
                                      { locale: id }
                                    )}
                                  </div>
                                </div>
                              </div>
                              {session.score && (
                                <div className="mt-3 flex items-center justify-between p-2 bg-green-50 rounded">
                                  <span className="text-sm font-medium text-green-800">
                                    Skor Total:
                                  </span>
                                  <span className="text-lg font-bold text-green-600">
                                    {session.score}
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Test Attempts - Show latest 3 */}
                  {data.psychotest_history.attempts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            Riwayat Tes Terbaru
                          </div>
                          {data.psychotest_history.attempts.length > 3 && (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat Semua (
                              {data.psychotest_history.attempts.length})
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.psychotest_history.attempts
                          .slice(0, 3)
                          .map((attempt, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-medium truncate">
                                    {attempt.test_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge
                                      className={userDetailHelpers.getCategoryColor(
                                        attempt.test_category
                                      )}
                                    >
                                      {attempt.test_category.toUpperCase()}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {attempt.module_type}
                                    </Badge>
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    userDetailHelpers.getStatusBadge(
                                      attempt.status
                                    ).className
                                  }
                                >
                                  {
                                    userDetailHelpers.getStatusBadge(
                                      attempt.status
                                    ).label
                                  }
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">
                                    Tanggal:
                                  </span>
                                  <div className="font-medium">
                                    {format(
                                      new Date(attempt.attempt_date),
                                      "dd MMM yyyy",
                                      { locale: id }
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Durasi:
                                  </span>
                                  <div className="font-medium">
                                    {userDetailHelpers.formatDuration(
                                      attempt.duration_minutes
                                    )}
                                  </div>
                                </div>
                              </div>

                              {attempt.scaled_score && (
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">
                                          Skor:
                                        </span>
                                        <span className="font-bold ml-1 text-lg">
                                          {attempt.scaled_score}
                                        </span>
                                      </div>
                                      {attempt.percentile && (
                                        <div className="text-sm">
                                          <span className="text-muted-foreground">
                                            Persentil:
                                          </span>
                                          <span className="font-bold ml-1">
                                            {attempt.percentile}%
                                          </span>
                                        </div>
                                      )}
                                      {attempt.grade && (
                                        <Badge
                                          variant="outline"
                                          className={userDetailHelpers.getGradeColor(
                                            attempt.grade
                                          )}
                                        >
                                          Grade {attempt.grade}
                                        </Badge>
                                      )}
                                    </div>
                                    {attempt.is_passed !== undefined && (
                                      <div className="flex items-center gap-1">
                                        {attempt.is_passed ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : (
                                          <X className="h-5 w-5 text-red-600" />
                                        )}
                                        <span
                                          className={`text-sm font-medium ${attempt.is_passed ? "text-green-600" : "text-red-600"}`}
                                        >
                                          {attempt.is_passed
                                            ? "Lulus"
                                            : "Tidak Lulus"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Results Analysis */}
                  {data.psychotest_history.results_analysis.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Analisis Hasil
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {data.psychotest_history.results_analysis
                          .slice(0, 2)
                          .map((result, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">
                                  {result.test_name}
                                </h4>
                                <Badge
                                  className={userDetailHelpers.getCategoryColor(
                                    result.category
                                  )}
                                >
                                  {result.category.toUpperCase()}
                                </Badge>
                              </div>

                              {result.traits.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium mb-2">
                                    Traits Teridentifikasi:
                                  </h5>
                                  <div className="flex flex-wrap gap-2">
                                    {result.traits
                                      .slice(0, 6)
                                      .map((trait, traitIndex) => (
                                        <Badge
                                          key={traitIndex}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {trait.name} ({trait.score})
                                        </Badge>
                                      ))}
                                    {result.traits.length > 6 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        +{result.traits.length - 6} lainnya
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {result.recommendations.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium mb-2">
                                    Rekomendasi:
                                  </h5>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {result.recommendations
                                      .slice(0, 3)
                                      .map((rec, recIndex) => (
                                        <li
                                          key={recIndex}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="text-primary mt-1 flex-shrink-0">
                                            •
                                          </span>
                                          <span>{rec}</span>
                                        </li>
                                      ))}
                                    {result.recommendations.length > 3 && (
                                      <li className="text-xs text-muted-foreground italic">
                                        ... dan{" "}
                                        {result.recommendations.length - 3}{" "}
                                        rekomendasi lainnya
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}

                        {data.psychotest_history.results_analysis.length >
                          2 && (
                          <div className="text-center pt-2">
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Lihat Semua Analisis (
                              {data.psychotest_history.results_analysis.length})
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Empty State */}
                  {data.psychotest_history.statistics.total_attempts === 0 && (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center space-y-4">
                          <Brain className="h-16 w-16 text-gray-300 mx-auto" />
                          <div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">
                              Belum Ada Riwayat Psikotes
                            </h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                              Peserta ini belum mengikuti sesi psikotes apapun.
                              Data akan muncul setelah peserta mulai mengerjakan
                              tes.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer with Action Buttons */}
        {data && (
          <DrawerFooter className="border-t bg-background/80 backdrop-blur-sm">
            <div className="flex gap-3 max-w-md mx-auto w-full">
              <Button variant="outline" className="flex-1" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Unduh Laporan
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Hasil Detail
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
