import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  CalendarIcon,
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
} from "lucide-react";

// UI Components
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Store
import { useRegistrationStore } from "~/stores/registration";
import { cn } from "~/lib/utils";

// Validation schema
const step1Schema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(255, "Nama maksimal 255 karakter"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid"),
  email: z.string().email("Format email tidak valid"),
  nik: z
    .string()
    .length(16, "NIK harus 16 digit")
    .regex(/^[0-9]+$/, "NIK hanya boleh berisi angka"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Jenis kelamin harus dipilih",
  }),
  birth_place: z.string().min(2, "Tempat lahir minimal 2 karakter"),
  birth_date: z.string().min(1, "Tanggal lahir harus diisi"),
});

type Step1FormData = z.infer<typeof step1Schema>;

interface Step1DataWajibProps {
  onNext: () => void;
}

export function Step1DataWajib({ onNext }: Step1DataWajibProps) {
  const { data, updateData } = useRegistrationStore();
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    data.birth_date ? new Date(data.birth_date) : undefined
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      nik: data.nik,
      gender: data.gender as any,
      birth_place: data.birth_place,
      birth_date: data.birth_date,
    },
    mode: "onChange",
  });

  const watchedGender = watch("gender");

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setBirthDate(date);
      const formattedDate = format(date, "yyyy-MM-dd");
      setValue("birth_date", formattedDate, { shouldValidate: true });
    }
  };

  const onSubmit = (formData: Step1FormData) => {
    updateData(formData);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Data Wajib
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lengkapi data diri wajib untuk melanjutkan pendaftaran
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nama Lengkap *
              </Label>
              <Input
                id="name"
                placeholder="Masukkan nama lengkap"
                {...register("name")}
                className={cn(errors.name && "border-red-500")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Nomor Telepon */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Nomor Telepon *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="081234567890"
                {...register("phone")}
                className={cn(errors.phone && "border-red-500")}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                {...register("email")}
                className={cn(errors.email && "border-red-500")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* NIK */}
            <div className="space-y-2">
              <Label htmlFor="nik" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                NIK (16 digit) *
              </Label>
              <Input
                id="nik"
                placeholder="1234567890123456"
                maxLength={16}
                {...register("nik")}
                className={cn(errors.nik && "border-red-500")}
              />
              {errors.nik && (
                <p className="text-sm text-red-500">{errors.nik.message}</p>
              )}
            </div>

            {/* Tempat Lahir */}
            <div className="space-y-2">
              <Label htmlFor="birth_place" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Tempat Lahir *
              </Label>
              <Input
                id="birth_place"
                placeholder="Jakarta"
                {...register("birth_place")}
                className={cn(errors.birth_place && "border-red-500")}
              />
              {errors.birth_place && (
                <p className="text-sm text-red-500">
                  {errors.birth_place.message}
                </p>
              )}
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Tanggal Lahir *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !birthDate && "text-muted-foreground",
                      errors.birth_date && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? (
                      format(birthDate, "dd MMMM yyyy", { locale: id })
                    ) : (
                      <span>Pilih tanggal lahir</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={handleDateSelect}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
              {errors.birth_date && (
                <p className="text-sm text-red-500">
                  {errors.birth_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Jenis Kelamin */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Jenis Kelamin *</Label>
            <RadioGroup
              value={watchedGender}
              onValueChange={(value) =>
                setValue("gender", value as any, { shouldValidate: true })
              }
              className="flex flex-wrap gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Laki-laki</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Perempuan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Lainnya</Label>
              </div>
            </RadioGroup>
            {errors.gender && (
              <p className="text-sm text-red-500">{errors.gender.message}</p>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={!isValid} className="min-w-32">
              Lanjutkan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
