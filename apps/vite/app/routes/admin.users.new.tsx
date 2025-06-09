import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

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
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";

// Icons
import {
  ArrowLeft,
  User,
  UserCheck,
  Users,
  Eye,
  EyeOff,
  Info,
  Save,
  UserPlus,
} from "lucide-react";

// Hooks and Types
import { useUsers } from "~/hooks/use-users";
import type { Route } from "./+types/admin.users.new";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tambah User Baru - Syntegra Psikotes" },
    { name: "description", content: "Tambahkan user admin atau peserta baru" },
  ];
}

// Form validation schema
const createUserSchema = z
  .object({
    // Basic Info (Required)
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z.string().email("Format email tidak valid"),
    role: z.enum(["admin", "participant"], {
      required_error: "Pilih role user",
    }),

    // Authentication (Conditional)
    password: z
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
  })
  .refine(
    (data) => {
      if (data.role === "admin") {
        return !!data.password;
      }
      return true;
    },
    {
      message: "Password wajib untuk admin",
      path: ["password"],
    }
  )
  .refine(
    (data) => {
      if (data.role === "participant") {
        return !!data.nik;
      }
      return true;
    },
    {
      message: "NIK wajib untuk peserta",
      path: ["nik"],
    }
  );

type CreateUserFormData = z.infer<typeof createUserSchema>;

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

export default function AdminUsersNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const { useCreateAdmin, useCreateParticipant } = useUsers();
  const createAdminMutation = useCreateAdmin();
  const createParticipantMutation = useCreateParticipant();

  // Get initial role from query params
  const typeParam = searchParams.get("type");
  const initialRole = typeParam === "admin" ? "admin" : "participant";

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: initialRole,
      gender: "other",
    },
  });

  const watchedRole = form.watch("role");
  const isAdmin = watchedRole === "admin";
  const isParticipant = watchedRole === "participant";

  const isSubmitting =
    createAdminMutation.isPending || createParticipantMutation.isPending;

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      if (data.role === "admin") {
        await createAdminMutation.mutateAsync(data);
        toast.success("Admin berhasil dibuat!");
      } else {
        await createParticipantMutation.mutateAsync(data);
        toast.success("Peserta berhasil didaftarkan!");
      }

      navigate("/admin/users");
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error("Failed to create user:", error);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (window.confirm("Data belum disimpan. Yakin ingin membatalkan?")) {
        navigate("/admin/users");
      }
    } else {
      navigate("/admin/users");
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tambah User Baru
          </h1>
          <p className="text-muted-foreground">
            Buat akun admin atau daftarkan peserta baru
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Role Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5" />
                Tipe User
              </CardTitle>
              <CardDescription>
                Pilih tipe user yang akan dibuat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem
                            value="participant"
                            id="participant"
                          />
                          <Label
                            htmlFor="participant"
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Users className="size-5 text-blue-600" />
                              <div>
                                <div className="font-medium">Peserta</div>
                                <div className="text-sm text-muted-foreground">
                                  Pengguna yang akan mengikuti tes psikologi
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="admin" id="admin" />
                          <Label
                            htmlFor="admin"
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <UserCheck className="size-5 text-green-600" />
                              <div>
                                <div className="font-medium">Admin</div>
                                <div className="text-sm text-muted-foreground">
                                  Pengelola sistem dan modul tes
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role specific info */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="size-4 mt-0.5 text-blue-600" />
                  <div className="text-sm">
                    {isAdmin ? (
                      <div>
                        <div className="font-medium">Catatan Admin:</div>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          <li>• Password wajib diisi untuk akun admin</li>
                          <li>
                            • NIK opsional (akan dibuat otomatis jika kosong)
                          </li>
                          <li>• Maksimal 3 admin dalam sistem</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">Catatan Peserta:</div>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                          <li>• NIK wajib diisi untuk identifikasi</li>
                          <li>• Login menggunakan nomor HP (tanpa password)</li>
                          <li>• Data lengkap membantu analisis hasil tes</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                        NIK{" "}
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
                      {isAdmin && (
                        <FormDescription>
                          Kosongkan untuk generate otomatis
                        </FormDescription>
                      )}
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
                          <p className="ml-2 text-xs text-green-600 font-medium">
                            [Untuk Login]
                          </p>
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

              {/* Password for Admin */}
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Masukkan password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Minimal 8 karakter, harus mengandung huruf besar, kecil,
                        angka, dan simbol
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Data Personal</CardTitle>
              <CardDescription>
                Informasi personal untuk profil lengkap (opsional)
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
              <CardDescription>
                Informasi alamat domisili (opsional)
              </CardDescription>
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

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="sm:w-auto"
                >
                  Batal
                </Button>
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
                      {isAdmin ? "Buat Admin" : "Daftarkan Peserta"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
