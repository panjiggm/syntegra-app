import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";
import {
  createTestSchema,
  categoryOptionsByModuleType,
  type CreateTestFormData,
} from "~/lib/validations/test";
import { FormNewTest } from "~/components/admin/test-new/FormNewTest";
import { SidebarTips } from "~/components/admin/test-new/SidebarTips";
export function meta() {
  return [
    { title: "Buat Tes Baru - Syntegra Psikotes" },
    { name: "description", content: "Tambahkan modul psikotes baru ke sistem" },
  ];
}

interface CreateTestResponse {
  success: boolean;
  message: string;
  data: any;
}

export default function AdminTestsNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async (data: CreateTestFormData) => {
      const response = await apiClient.post<CreateTestResponse>("/tests", data);
      if (!response.success) {
        throw new Error(response.message || "Failed to create test");
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch tests
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });

  const form = useForm({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      name: "",
      description: "",
      module_type: "intelligence",
      category: "wais",
      icon: "",
      card_color: "",
      time_limit: 0,
      passing_score: 80,
      question_type: "multiple_choice",
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
      navigate("/admin/tests");
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
        navigate("/admin/tests");
      }
    } else {
      navigate("/admin/tests");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="link"
            size="sm"
            className="cursor-pointer"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Buat Tes Baru</h1>
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
  );
}
