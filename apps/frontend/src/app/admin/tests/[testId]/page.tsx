"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Settings,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useTests } from "@/hooks/useTests";
import { TestOverview } from "./_components/TestOverview";
import { TestBankSoal } from "./_components/TestBankSoal";

// Module type labels mapping
const MODULE_TYPE_LABELS = {
  intelligence: "Inteligensi",
  personality: "Kepribadian",
  aptitude: "Bakat",
  interest: "Minat",
  projective: "Proyektif",
  cognitive: "Kognitif",
} as const;

// Category labels mapping
const CATEGORY_LABELS = {
  wais: "WAIS",
  mbti: "MBTI",
  wartegg: "Wartegg",
  riasec: "RIASEC",
  kraepelin: "Kraepelin",
  pauli: "Pauli",
  big_five: "Big Five",
  papi_kostick: "PAPI Kostick",
  dap: "DAP",
  raven: "Raven",
  epps: "EPPS",
  army_alpha: "Army Alpha",
  htp: "HTP",
  disc: "DISC",
  iq: "IQ Test",
  eq: "EQ Test",
} as const;

// Status badge component
const StatusBadge = ({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) => {
  const variants = {
    active: "bg-green-100 text-green-700 hover:bg-green-200",
    inactive: "bg-red-100 text-red-700 hover:bg-red-200",
    archived: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  };

  const labels = {
    active: "Aktif",
    inactive: "Tidak Aktif",
    archived: "Diarsipkan",
  };

  return (
    <Badge className={variants[status]} variant="secondary">
      {labels[status]}
    </Badge>
  );
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = params.testId as string;

  // Get initial tab from URL or default to overview
  const getInitialTab = () => {
    const urlTab = searchParams.get("tab");
    // Map URL tab names to internal tab names
    if (urlTab === "question") return "bank-soal";
    if (urlTab === "overview") return "overview";
    return "overview"; // default
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Map internal tab names to URL tab names
    const urlTabName = value === "bank-soal" ? "question" : value;

    // Update URL with new tab parameter
    const newUrl = `/admin/tests/${testId}?tab=${urlTabName}`;
    router.replace(newUrl, { scroll: false });
  };

  // Sync tab with URL params on mount and when searchParams change
  useEffect(() => {
    const newTab = getInitialTab();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams]);

  // API calls
  const { useGetTestById } = useTests();
  const testQuery = useGetTestById(testId);

  // Handle refresh
  const handleRefresh = () => {
    testQuery.refetch();
  };

  // Loading state
  if (testQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Memuat detail tes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (testQuery.error) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex items-center gap-3">
          <Button variant="link" size="sm" asChild>
            <Link href="/admin/tests">
              <ArrowLeft className="size-4 mr-2" />
              Kembali
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Gagal Memuat Detail Tes
            </h3>
            <p className="text-muted-foreground mb-4">
              {testQuery.error.message ||
                "Terjadi kesalahan saat memuat detail tes"}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const test = testQuery.data?.data;

  if (!test) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="link" size="sm" asChild>
            <Link href="/admin/tests">
              <ArrowLeft className="size-4 mr-2" />
              Kembali
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tes Tidak Ditemukan</h3>
            <p className="text-muted-foreground">
              Tes dengan ID tersebut tidak ditemukan dalam sistem
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Button variant="link" size="sm" asChild>
        <Link href="/admin/tests">
          <ArrowLeft className="size-4 mr-2" />
          Kembali
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">{test.name}</h1>
              <p className="text-xs text-muted-foreground">
                {test.description}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Badge
                  className="bg-cyan-100 text-cyan-700"
                  variant="secondary"
                >
                  {
                    MODULE_TYPE_LABELS[
                      test.module_type as keyof typeof MODULE_TYPE_LABELS
                    ]
                  }
                </Badge>
                <Badge variant="outline">
                  {
                    CATEGORY_LABELS[
                      test.category as keyof typeof CATEGORY_LABELS
                    ]
                  }
                </Badge>
                <StatusBadge status={test.status || "active"} />
                <p className="text-sm text-muted-foreground">ID: {test.id}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={`/admin/tests/edit?testId=${testId}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Tes
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6 mt-8"
      >
        <div className="space-y-4">
          <TabsList className="inline-flex">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 px-8"
            >
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="bank-soal"
              className="flex items-center gap-2 px-8"
            >
              <BarChart3 className="h-4 w-4" />
              Bank Soal
            </TabsTrigger>
          </TabsList>
          <div className="w-full border-b border-border"></div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <TestOverview
            test={{
              ...test,
              description: test.description ?? undefined,
              icon: test.icon ?? undefined,
              card_color: test.card_color ?? undefined,
              test_prerequisites: test.test_prerequisites ?? undefined,
              subcategory: test.subcategory ?? undefined,
              passing_score: test.passing_score ?? undefined,
              instructions: test.instructions ?? undefined,
              created_at: test.created_at
                ? new Date(test.created_at).toISOString()
                : undefined,
              updated_at: test.updated_at
                ? new Date(test.updated_at).toISOString()
                : undefined,
              created_by: test.created_by ?? undefined,
              updated_by: test.updated_by ?? undefined,
            }}
          />
        </TabsContent>

        <TabsContent value="bank-soal" className="space-y-6">
          <TestBankSoal testId={testId} test={test} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
