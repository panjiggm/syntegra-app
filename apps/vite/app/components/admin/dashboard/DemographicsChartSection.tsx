import { UserProfileChart } from "./UserProfileChart";
import { ProvinceChart } from "./ProvinceChart";
import { AgeDistributionChart } from "./AgeDistributionChart";

interface DemographicsChartSectionProps {
  className?: string;
}

export function DemographicsChartSection({
  className,
}: DemographicsChartSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* First Row: User Profile & Age Distribution (6:6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-">
          <UserProfileChart />
        </div>
        <div className="lg:col-span-2">
          <AgeDistributionChart />
        </div>
      </div>

      {/* Second Row: Province Distribution (full width) */}
      <div className="grid grid-cols-1">
        <ProvinceChart />
      </div>
    </div>
  );
}
