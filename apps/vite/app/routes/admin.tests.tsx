import { Button } from "~/components/ui/button";
import { useTests } from "~/hooks/use-tests";
import { Plus } from "lucide-react";
import { CardAnalyticTest } from "~/components/admin/test/CardAnalyticTest";
import { useNavigate } from "react-router";
import { DialogDeleteTest } from "~/components/admin/test/DialogDeleteTest";
import { TestsTableView } from "~/components/admin/test/TestsTableView";

export function meta() {
  return [
    { title: "Modul Psikotes - Admin Panel" },
    { name: "description", content: "Kelola modul tes psikologi" },
  ];
}

export default function AdminTestsPage() {
  const navigate = useNavigate();
  const { useGetTestStats } = useTests();

  const { data: statsData, isLoading: statsLoading } = useGetTestStats();

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header - Always show */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modul Psikotes</h1>
          <p className="text-muted-foreground text-sm">
            Kelola dan konfigurasikan modul tes psikologi
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/tests/new")}>
            <Plus className="size-4 mr-2" />
            Tambah Tes
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Show with skeleton loading */}
      <CardAnalyticTest statsData={statsData} isLoading={statsLoading} />

      <TestsTableView />

      <DialogDeleteTest />
    </div>
  );
}
