import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// UI Components
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { Switch } from "~/components/ui/switch";

// Icons
import {
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  Info,
  Save,
  RefreshCw,
  Settings,
  Lock,
  Shield,
} from "lucide-react";

// API and Types
import { apiClient } from "~/lib/api-client";
import { useUsers } from "~/hooks/use-users";
import { useAuth } from "~/contexts/auth-context";
import type { Route } from "./+types/admin.users.$userId.edit";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Edit User - Syntegra Psikotes` },
    { name: "description", content: "Edit informasi pengguna sistem" },
  ];
}

// Form validation schema
const updateUserSchema = z
  .object({
    // Basic Info
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z.string().email("Format email tidak valid"),

    // Identity
    nik: z
      .string()
      .optional()
      .refine((val) => !val || val.length === 16, {
        message: "NIK harus 16 digit",
      })
      .refine((val) => !val || /^\d+$/.test(val), {
        message: "NIK hanya boleh angka",
      }),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 10, {
        message: "Nomor HP minimal 10 digit",
      }),

    // Personal Details
    gender: z.enum(["male", "female", "other"]).optional(),
    birth_place: z.string().max(100).optional(),
    birth_date: z.string().optional(),
    religion: z
      .enum([
        "islam",
        "kristen",
        "katolik",
        "hindu",
        "buddha",
        "konghucu",
        "other",
      ])
      .optional(),
    education: z
      .enum(["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"])
      .optional(),

    // Address
    address: z.string().max(500).optional(),
    province: z.string().max(100).optional(),
    regency: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    village: z.string().max(100).optional(),
    postal_code: z
      .string()
      .max(10)
      .optional()
      .refine((val) => !val || /^\d+$/.test(val), {
        message: "Kode pos hanya boleh angka",
      }),

    // Account Status (Admin only fields)
    is_active: z.boolean().optional(),
    email_verified: z.boolean().optional(),

    // Password Change (Optional)
    current_password: z.string().optional(),
    new_password: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 8, {
        message: "Password minimal 8 karakter",
      })
      .refine(
        (val) =>
          !val ||
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
            val
          ),
        {
          message:
            "Password harus mengandung huruf besar, kecil, angka, dan simbol",
        }
      ),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.new_password && data.new_password !== data.confirm_password) {
        return false;
      }
      return true;
    },
    {
      message: "Konfirmasi password tidak cocok",
      path: ["confirm_password"],
    }
  )
  .refine(
    (data) => {
      if (data.new_password && !data.current_password) {
        return false;
      }
      return true;
    },
    {
      message: "Password lama wajib diisi untuk mengubah password",
      path: ["current_password"],
    }
  );

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Types for API response
interface UserDetail {
  id: string;
  nik: string | null;
  name: string;
  role: "admin" | "participant";
  email: string;
  gender: "male" | "female" | "other" | null;
  phone: string | null;
  birth_place: string | null;
  birth_date: string | null;
  religion: string | null;
  education: string | null;
  address: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  village: string | null;
  postal_code: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface GetUserDetailResponse {
  success: boolean;
  message: string;
  data: UserDetail;
  timestamp: string;
}

// Options for select fields
const genderOptions = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
  { value: "other", label: "Lainnya" },
];

const religionOptions = [
  { value: "islam", label: "Islam" },
  { value: "kristen", label: "Kristen" },
  { value: "katolik", label: "Katolik" },
  { value: "hindu", label: "Hindu" },
  { value: "buddha", label: "Buddha" },
  { value: "konghucu", label: "Konghucu" },
  { value: "other", label: "Lainnya" },
];

const educationOptions = [
  { value: "sd", label: "SD" },
  { value: "smp", label: "SMP" },
  { value: "sma", label: "SMA/SMK" },
  { value: "diploma", label: "Diploma" },
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
  { value: "other", label: "Lainnya" },
];

export default function AdminUsersEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, hasRole } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false);

  const { useUpdateUser } = useUsers();
  const updateUserMutation = useUpdateUser();

  // Fetch user details
  const {
    data: userDetail,
    isLoading: userLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery<UserDetail>({
    queryKey: ["user-detail", userId],
    queryFn: async () => {
      const response = await apiClient.get<GetUserDetailResponse>(
        `/users/${userId}`
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch user details");
      }
      return response.data;
    },
    enabled: !!userId,
    retry: 2,
  });

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      nik: "",
      phone: "",
      gender: "other",
      birth_place: "",
      birth_date: "",
      religion: undefined,
      education: undefined,
      address: "",
      province: "",
      regency: "",
      district: "",
      village: "",
      postal_code: "",
      is_active: true,
      email_verified: false,
    },
  });

  // Populate form when user data is loaded
  useEffect(() => {
    if (userDetail) {
      form.reset({
        name: userDetail.name || "",
        email: userDetail.email || "",
        nik: userDetail.nik || "",
        phone: userDetail.phone || "",
        gender: userDetail.gender || "other",
        birth_place: userDetail.birth_place || "",
        birth_date: userDetail.birth_date
          ? userDetail.birth_date.split("T")[0]
          : "",
        religion: (userDetail.religion || undefined) as any,
        education: (userDetail.education || undefined) as any,
        address: userDetail.address || "",
        province: userDetail.province || "",
        regency: userDetail.regency || "",
        district: userDetail.district || "",
        village: userDetail.village || "",
        postal_code: userDetail.postal_code || "",
        is_active: userDetail.is_active ?? true,
        email_verified: userDetail.email_verified ?? false,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    }
  }, [userDetail, form]);

  const isSubmitting = updateUserMutation.isPending;
  const isAdmin = userDetail?.role === "admin";
  const isParticipant = userDetail?.role === "participant";
  const isSelfEdit = currentUser?.id === userId;
  const canEditAccountStatus = hasRole("admin") && !isSelfEdit;
  const canChangePassword = isAdmin && (isSelfEdit || hasRole("admin"));

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!userId) return;

    try {
      // Prepare update data
      const updateData: any = {
        name: data.name,
        email: data.email,
        nik: data.nik || undefined,
        phone: data.phone || undefined,
        gender: data.gender,
        birth_place: data.birth_place || undefined,
        birth_date: data.birth_date || undefined,
        religion: data.religion,
        education: data.education,
        address: data.address || undefined,
        province: data.province || undefined,
        regency: data.regency || undefined,
        district: data.district || undefined,
        village: data.village || undefined,
        postal_code: data.postal_code || undefined,
      };

      // Add admin-only fields
      if (canEditAccountStatus) {
        updateData.is_active = data.is_active;
        updateData.email_verified = data.email_verified;
      }

      // Add password change if provided
      if (canChangePassword && data.new_password) {
        updateData.current_password = data.current_password;
        updateData.new_password = data.new_password;
      }

      await updateUserMutation.mutateAsync({ id: userId, data: updateData });
      toast.success("User berhasil diupdate!");

      // Refresh user data
      await refetchUser();

      // Reset password fields
      if (isPasswordChangeMode) {
        form.setValue("current_password", "");
        form.setValue("new_password", "");
        form.setValue("confirm_password", "");
        setIsPasswordChangeMode(false);
      }
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error("Failed to update user:", error);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (window.confirm("Perubahan belum disimpan. Yakin ingin kembali?")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // Check authorization
  if (!hasRole("admin") && !isSelfEdit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to edit this user.
          </p>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userError || !userDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-xl font-semibold">Gagal memuat data user</h2>
        <p className="text-muted-foreground">
          {userError instanceof Error
            ? userError.message
            : "Terjadi kesalahan saat memuat data"}
        </p>
        <Button onClick={() => refetchUser()}>
          <RefreshCw className="size-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="link"
          size="sm"
          onClick={handleCancel}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Edit informasi {userDetail.name || "Unknown User"} (
            {userDetail.role || "Unknown Role"})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchUser()}
            disabled={userLoading}
          >
            <RefreshCw
              className={`size-4 mr-2 ${userLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                {userDetail.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {userDetail.name || "Unknown User"}
                  {userDetail.role === "admin" ? (
                    <Shield className="size-4 text-green-600" />
                  ) : (
                    <User className="size-4 text-blue-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  {userDetail.role === "admin" ? "Administrator" : "Peserta"} •{" "}
                  {userDetail.email}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={userDetail.is_active ? "default" : "secondary"}>
                {userDetail.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
              {userDetail.email_verified && (
                <Badge variant="outline" className="ml-2">
                  Email Verified
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Informasi Dasar
              </CardTitle>
              <CardDescription>Data identitas dan kontak utama</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nama Lengkap <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama lengkap" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contoh@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        NIK
                        {isParticipant && (
                          <span className="text-red-500">*</span>
                        )}
                        {isAdmin && (
                          <Badge variant="secondary" className="ml-2">
                            Opsional
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="16 digit NIK"
                          maxLength={16}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nomor HP
                        {isParticipant && (
                          <span className="ml-2 text-xs text-green-600 font-medium">
                            [Untuk Login]
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="08xxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Data Personal</CardTitle>
              <CardDescription>
                Informasi personal untuk profil lengkap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih jenis kelamin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genderOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempat Lahir</FormLabel>
                      <FormControl>
                        <Input placeholder="Kota kelahiran" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Lahir</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agama</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih agama" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {religionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pendidikan Terakhir</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih pendidikan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {educationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Alamat</CardTitle>
              <CardDescription>Informasi alamat domisili</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat Lengkap</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jl. Contoh No. 123, RT/RW"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provinsi</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama provinsi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kabupaten/Kota</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama kabupaten/kota" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kecamatan</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama kecamatan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="village"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelurahan/Desa</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama kelurahan/desa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Pos</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" maxLength={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Status (Admin Only) */}
          {canEditAccountStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-5" />
                  Status Akun
                </CardTitle>
                <CardDescription>
                  Pengaturan status dan keamanan akun
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Status Aktif
                          </FormLabel>
                          <FormDescription>
                            User dapat login dan mengakses sistem
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email_verified"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Terverifikasi
                          </FormLabel>
                          <FormDescription>
                            Email telah dikonfirmasi valid
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password Change (Admin Only) */}
          {canChangePassword && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="size-5" />
                      Ubah Password
                    </CardTitle>
                    <CardDescription>
                      Ubah password untuk akun admin
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setIsPasswordChangeMode(!isPasswordChangeMode)
                    }
                  >
                    {isPasswordChangeMode ? "Batal" : "Ubah Password"}
                  </Button>
                </div>
              </CardHeader>
              {isPasswordChangeMode && (
                <CardContent className="space-y-6">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="size-4 mt-0.5 text-yellow-600" />
                      <div className="text-sm">
                        <div className="font-medium text-yellow-800">
                          Perhatian:
                        </div>
                        <div className="text-yellow-700">
                          Pastikan password baru mudah diingat namun tetap aman.
                          Password akan langsung berubah setelah disimpan.
                        </div>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="current_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Password Lama <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Masukkan password lama"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password Baru{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Masukkan password baru"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowNewPassword(!showNewPassword)
                                }
                              >
                                {showNewPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Minimal 8 karakter, harus mengandung huruf besar,
                            kecil, angka, dan simbol
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Konfirmasi Password{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Ulangi password baru"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/admin/users/${userId}`)}
                    disabled={isSubmitting}
                  >
                    Lihat Detail
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="size-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>

              {form.formState.isDirty && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="size-4 mt-0.5 text-blue-600" />
                    <div className="text-sm text-blue-700">
                      Ada perubahan yang belum disimpan. Pastikan untuk
                      menyimpan sebelum meninggalkan halaman.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
