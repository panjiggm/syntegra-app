"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTests } from "@/hooks/useTests";
import {
  createTestSchema,
  categoryOptionsByModuleType,
  type CreateTestFormData,
} from "@/lib/validations/test";
import { FormNewTest } from "./_components/FormNewTest";
import { SidebarTips } from "./_components/SidebarTips";

export default function CreateTestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { useCreateTest } = useTests();
  const createTestMutation = useCreateTest();

  const form = useForm({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      name: "",
      description: "",
      module_type: "intelligence",
      category: "wais",
      time_limit: 30,
      icon: "",
      card_color: "",
      passing_score: 0,
      display_order: 0,
      status: "active",
    },
    mode: "onChange",
  });

  const watchedModuleType = form.watch("module_type");
  const watchedIcon = form.watch("icon");
  const watchedCardColor = form.watch("card_color");

  // Reset category when module type changes
  useEffect(() => {
    if (watchedModuleType) {
      form.setValue("category", undefined as any);
    }
  }, [watchedModuleType, form]);

  // Get available categories based on selected module type
  const availableCategories = watchedModuleType
    ? categoryOptionsByModuleType[watchedModuleType] || []
    : [];

  const onSubmit = async (data: CreateTestFormData) => {
    try {
      setIsSubmitting(true);

      // Prepare data for API
      const submitData = {
        ...data,
        description: data.description || undefined,
        icon: data.icon || undefined,
        card_color: data.card_color || undefined,
        passing_score: data.passing_score || undefined,
        display_order: data.display_order || undefined,
      };

      await createTestMutation.mutateAsync(submitData);

      toast.success("Tes berhasil dibuat!", {
        description: `Tes "${data.name}" telah ditambahkan ke sistem.`,
        duration: 5000,
      });

      // Redirect to tests page
      router.push("/admin/tests");
    } catch (error: any) {
      console.error("Error creating test:", error);
      toast.error("Gagal membuat tes", {
        description:
          error?.message ||
          "Terjadi kesalahan saat membuat tes. Silakan coba lagi.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (window.confirm("Perubahan belum disimpan. Yakin ingin keluar?")) {
        router.push("/admin/tests");
      }
    } else {
      router.push("/admin/tests");
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Buat Tes Baru
              </h1>
              <p className="text-muted-foreground">
                Tambahkan modul psikotes baru ke dalam sistem untuk evaluasi
                kandidat
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form Component */}
            <FormNewTest
              form={form}
              onSubmit={onSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              watchedModuleType={watchedModuleType}
              watchedIcon={watchedIcon}
              watchedCardColor={watchedCardColor}
              availableCategories={availableCategories}
            />

            {/* Sidebar Tips Component */}
            <SidebarTips form={form} />
          </div>
        </div>
      </div>
    </>
  );
}
