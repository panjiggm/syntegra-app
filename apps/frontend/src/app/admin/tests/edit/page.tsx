"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTests } from "@/hooks/useTests";
import {
  createTestSchema,
  categoryOptionsByModuleType,
  type CreateTestFormData,
} from "@/lib/validations/test";
import { FormEditTest } from "./_components/FormEditTest";
import { SidebarTips } from "./_components/SidebarTips";

export default function EditTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const { useGetTestById, useUpdateTest } = useTests();

  // Get test data
  const {
    data: testData,
    isLoading: isLoadingTest,
    error: testError,
    refetch: refetchTest,
  } = useGetTestById(testId || "");

  const updateTestMutation = useUpdateTest();

  const form = useForm({
    resolver: zodResolver(createTestSchema),
    mode: "onChange",
  });

  const watchedModuleType = form.watch("module_type");
  const watchedIcon = form.watch("icon");
  const watchedCardColor = form.watch("card_color");
  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description");
  const watchedStatus = form.watch("status");
  const watchedTimeLimit = form.watch("time_limit");
  const watchedCategory = form.watch("category");

  // Redirect if no testId
  useEffect(() => {
    if (!testId) {
      toast.error("ID tes tidak ditemukan");
      router.push("/admin/tests");
    }
  }, [testId, router]);

  // Load initial data into form
  useEffect(() => {
    if (testData?.data && !initialDataLoaded) {
      const test = testData.data;

      form.reset({
        name: test.name,
        description: test.description || "",
        module_type: test.module_type,
        category: test.category,
        time_limit: test.time_limit,
        icon: test.icon || "",
        card_color: test.card_color || "",
        passing_score: test.passing_score || 0,
        display_order: test.display_order || 0,
        status: test.status || "active",
      });

      setInitialDataLoaded(true);

      console.log("Initial data loaded:", {
        icon: test.icon,
        card_color: test.card_color,
        name: test.name,
      });
    }
  }, [testData, form, initialDataLoaded]);

  // Reset category when module type changes (but not on initial load)
  useEffect(() => {
    if (watchedModuleType && initialDataLoaded) {
      const currentCategory = form.getValues("category");
      const availableCategories =
        categoryOptionsByModuleType[watchedModuleType] || [];

      // Check if current category is still valid for the new module type
      const isCategoryValid = availableCategories.some(
        (cat) => cat.value === currentCategory
      );

      if (!isCategoryValid) {
        form.setValue("category", "wais" as any);
        toast.info(
          "Kategori direset karena tidak kompatibel dengan tipe modul yang dipilih"
        );
      }
    }
  }, [watchedModuleType, form, initialDataLoaded]);

  // Get available categories based on selected module type
  const availableCategories = watchedModuleType
    ? categoryOptionsByModuleType[watchedModuleType] || []
    : [];

  const onSubmit = async (data: CreateTestFormData) => {
    if (!testId) return;

    try {
      setIsSubmitting(true);

      // Prepare data for API (only include changed fields)
      const originalData = testData?.data;
      const changedData: any = {};

      // Compare each field and only include if changed
      if (data.name !== originalData?.name) changedData.name = data.name;
      if (data.description !== (originalData?.description || "")) {
        changedData.description = data.description || undefined;
      }
      if (data.module_type !== originalData?.module_type)
        changedData.module_type = data.module_type;
      if (data.category !== originalData?.category)
        changedData.category = data.category;
      if (data.time_limit !== originalData?.time_limit)
        changedData.time_limit = data.time_limit;
      if (data.icon !== (originalData?.icon || "")) {
        changedData.icon = data.icon || undefined;
      }
      if (data.card_color !== (originalData?.card_color || "")) {
        changedData.card_color = data.card_color || undefined;
      }
      if (data.passing_score !== (originalData?.passing_score || 0)) {
        changedData.passing_score = data.passing_score || undefined;
      }
      if (data.display_order !== (originalData?.display_order || 0)) {
        changedData.display_order = data.display_order || undefined;
      }
      if (data.status !== (originalData?.status || "active"))
        changedData.status = data.status;

      // Check if there are any changes
      if (Object.keys(changedData).length === 0) {
        toast.info("Tidak ada perubahan untuk disimpan");
        return;
      }

      await updateTestMutation.mutateAsync({
        id: testId,
        data: changedData,
      });

      toast.success("Tes berhasil diperbarui!", {
        description: `Perubahan pada tes "${data.name}" telah disimpan.`,
        duration: 5000,
      });

      // Redirect to tests page
      router.back();
    } catch (error: any) {
      console.error("Error updating test:", error);
      toast.error("Gagal memperbarui tes", {
        description:
          error?.message ||
          "Terjadi kesalahan saat memperbarui tes. Silakan coba lagi.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      if (window.confirm("Perubahan belum disimpan. Yakin ingin keluar?")) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  // Loading state
  if (isLoadingTest) {
    return (
      <>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" disabled>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Tes</h1>
                <p className="text-muted-foreground">Memuat data tes...</p>
              </div>
            </div>

            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Memuat data tes...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (testError || !testData?.data) {
    return (
      <>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/tests")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Tes</h1>
                <p className="text-muted-foreground">Gagal memuat data tes</p>
              </div>
            </div>

            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Gagal Memuat Data
                </h3>
                <p className="text-muted-foreground mb-4">
                  {testError?.message ||
                    "Tes tidak ditemukan atau terjadi kesalahan"}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => refetchTest()} variant="outline">
                    <RefreshCw className="size-4 mr-2" />
                    Coba Lagi
                  </Button>
                  <Button onClick={() => router.push("/admin/tests")}>
                    Kembali ke Daftar Tes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const test = testData.data;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-6">
          <Button
            variant="link"
            size="sm"
            className="hover:cursor-pointer"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">Edit Tes</h1>
              <p className="text-muted-foreground">
                Perbarui informasi tes psikotes "{test.name}"
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              ID: {test.id}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form Component */}
            <FormEditTest
              form={form}
              onSubmit={onSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              watchedModuleType={watchedModuleType}
              watchedIcon={watchedIcon}
              watchedCardColor={watchedCardColor}
              watchedName={watchedName}
              watchedDescription={watchedDescription}
              availableCategories={availableCategories}
              test={test}
              initialDataLoaded={initialDataLoaded}
              watchedStatus={watchedStatus}
              watchedTimeLimit={watchedTimeLimit}
              watchedCategory={watchedCategory}
            />

            {/* Sidebar Tips Component */}
            <SidebarTips
              form={form}
              test={test}
              initialDataLoaded={initialDataLoaded}
            />
          </div>
        </div>
      </div>
    </>
  );
}
