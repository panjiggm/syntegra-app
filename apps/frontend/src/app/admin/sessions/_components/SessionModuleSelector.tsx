import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTests } from "@/hooks/useTests";
import { useSessionStore } from "@/stores/useSessionStore";
import { ArrowDown, ArrowUp, Brain, Info, Loader2, Trash2 } from "lucide-react";

export const SessionModuleSelector = () => {
  const { selectedModules, addModule, removeModule, updateModule } =
    useSessionStore();
  const { useGetTests } = useTests();
  const { data: testsResponse, isLoading: testsLoading } = useGetTests({
    page: 1,
    limit: 100,
    sort_by: "name",
    sort_order: "asc",
    status: "active",
  });

  const availableTests = testsResponse?.success ? testsResponse.data : [];

  const handleAddModule = (testId: string) => {
    const test = availableTests.find((t) => t.id === testId);
    if (!test) return;

    const newModule = {
      test_id: testId,
      test_name: test.name,
      test_category: test.category,
      sequence: selectedModules.length + 1,
      is_required: true,
      weight: 1.0,
    };

    addModule(newModule);
  };

  const handleUpdateSequence = (testId: string, direction: "up" | "down") => {
    const moduleIndex = selectedModules.findIndex((m) => m.test_id === testId);
    if (moduleIndex === -1) return;

    const currentModule = selectedModules[moduleIndex];
    const targetIndex = direction === "up" ? moduleIndex - 1 : moduleIndex + 1;

    if (targetIndex < 0 || targetIndex >= selectedModules.length) return;

    const targetModule = selectedModules[targetIndex];

    // Swap sequences
    updateModule(currentModule.test_id, { sequence: targetModule.sequence });
    updateModule(targetModule.test_id, { sequence: currentModule.sequence });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Modul Tes Psikotes</Label>
        <Select onValueChange={handleAddModule}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Tambah modul tes..." />
          </SelectTrigger>
          <SelectContent>
            {testsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">Memuat tes...</span>
              </div>
            ) : (
              availableTests
                .filter(
                  (test) => !selectedModules.find((m) => m.test_id === test.id)
                )
                .map((test) => (
                  <SelectItem key={test.id} value={test.id}>
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span>{test.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {test.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedModules.length === 0 ? (
        <CardAction className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Belum ada modul tes dipilih
              </p>
              <p className="text-sm text-muted-foreground">
                Pilih minimal 1 modul tes untuk sesi psikotes
              </p>
            </div>
          </CardContent>
        </CardAction>
      ) : (
        <div className="space-y-2">
          {selectedModules.map((module, index) => (
            <Card key={module.test_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateSequence(module.test_id, "up")}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleUpdateSequence(module.test_id, "down")
                      }
                      disabled={index === selectedModules.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{module.sequence}
                      </Badge>
                      <h4 className="font-medium">{module.test_name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {module.test_category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={module.is_required}
                          onCheckedChange={(checked) =>
                            updateModule(module.test_id, {
                              is_required: checked,
                            })
                          }
                        />
                        <Label className="text-sm">Wajib</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Bobot:</Label>
                        <Input
                          type="number"
                          value={module.weight}
                          onChange={(e) =>
                            updateModule(module.test_id, {
                              weight: parseFloat(e.target.value) || 1.0,
                            })
                          }
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          className="w-16 h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeModule(module.test_id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedModules.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <Info className="h-4 w-4 inline mr-1" />
          Total {selectedModules.length} modul dipilih. Urutan dapat diubah
          dengan tombol panah.
        </div>
      )}
    </div>
  );
};
