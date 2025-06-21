import { useParams } from "react-router";
import { useGetTestResult } from "~/hooks/use-results";
import { TestResultCard } from "~/components/admin/results/TestResultCard";
import { PersonalityRadarChart } from "~/components/admin/results/PersonalityRadarChart";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/admin.results.$attemptId";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hasil Test - Admin Syntegra Psikotes" },
    { name: "description", content: "Hasil psikotes" },
  ];
}

export default function AdminResultDetail() {
  const { attemptId } = useParams();
  const { data: result, isLoading, error } = useGetTestResult(attemptId!);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">Failed to load test result</div>
          <Button asChild variant="outline">
            <Link to="/admin/results">Back to Results</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/results">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Results
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Test Result Details</h1>
            {result && (
              <p className="text-gray-600">
                {result.test.name} - {result.user.name}
              </p>
            )}
          </div>
        </div>

        {result && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Result Card */}
        <div className="lg:col-span-2">
          <TestResultCard
            attemptId={attemptId!}
            result={result}
            showCalculateButton={true}
          />
        </div>

        {/* Personality Chart (if applicable) */}
        {result && result.test.module_type === "personality" && (
          <div className="lg:col-span-1">
            <PersonalityRadarChart result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
