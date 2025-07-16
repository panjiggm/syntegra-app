import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendSessionToggle } from "./TrendSessionToggle";
import { CategoryModuleToggle } from "./CategoryModuleToggle";
import { Badge } from "~/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";

export function DashboardChartSection() {
  return (
    <div className="grid grid-cols-12 gap-4 mb-6">
      {/* Left Section - 9 columns */}
      <div className="col-span-12 lg:col-span-9">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Analisis Trend & Aktivitas
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <TrendSessionToggle />
          </CardContent>
        </Card>
      </div>

      {/* Right Section - 3 columns */}
      <div className="col-span-12 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Distribusi Tes
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" />
                Statistik
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CategoryModuleToggle />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
