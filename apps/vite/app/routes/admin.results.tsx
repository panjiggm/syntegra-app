import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Calculator,
  Download,
  BarChart3,
} from "lucide-react";
import {
  useCalculateTestResult,
  getRecommendationColor,
  formatScorePercentage,
} from "~/hooks/use-results";
import type { Route } from "./+types/admin.results";

// Mock data - replace with actual API call
const mockResults = [
  {
    id: "1",
    attempt_id: "attempt-1",
    user: { name: "John Doe", email: "john@example.com" },
    test: {
      name: "Big Five Personality Test",
      category: "big_five",
      module_type: "personality",
    },
    scaled_score: 85,
    grade: "A",
    is_passed: true,
    completion_percentage: 100,
    calculated_at: "2024-01-15T10:30:00Z",
    attempt: { status: "completed" },
  },
  {
    id: "2",
    attempt_id: "attempt-2",
    user: { name: "Jane Smith", email: "jane@example.com" },
    test: {
      name: "WAIS Intelligence Test",
      category: "wais",
      module_type: "intelligence",
    },
    scaled_score: 72,
    grade: "B",
    is_passed: true,
    completion_percentage: 95,
    calculated_at: "2024-01-14T14:20:00Z",
    attempt: { status: "completed" },
  },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Hasil - Admin Syntegra Psikotes" },
    { name: "description", content: "Hasil psikotes" },
  ];
}

export default function AdminResults() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const calculateResult = useCalculateTestResult();

  const filteredResults = mockResults.filter((result) => {
    const matchesSearch =
      result.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.test.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule =
      selectedModule === "all" || result.test.module_type === selectedModule;
    return matchesSearch && matchesModule;
  });

  const handleCalculateResult = async (attemptId: string) => {
    try {
      await calculateResult.mutateAsync({
        attempt_id: attemptId,
        force_recalculate: true,
        calculation_options: {
          include_personality_analysis: true,
          include_intelligence_scoring: true,
          include_recommendations: true,
        },
      });
    } catch (error) {
      console.error("Failed to calculate result:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Results</h1>
          <p className="text-gray-600">Manage and analyze test results</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">247</div>
            <div className="text-sm text-gray-600">Total Results</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">189</div>
            <div className="text-sm text-gray-600">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">58</div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">82%</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by participant name or test..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Module: {selectedModule === "all" ? "All" : selectedModule}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedModule("all")}>
                  All Modules
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedModule("personality")}
                >
                  Personality
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedModule("intelligence")}
                >
                  Intelligence
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedModule("aptitude")}>
                  Aptitude
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{result.user.name}</div>
                      <div className="text-sm text-gray-600">
                        {result.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{result.test.name}</div>
                      <div className="text-sm text-gray-600 capitalize">
                        {result.test.module_type}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-lg font-bold">
                      {formatScorePercentage(result.scaled_score)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRecommendationColor(result.grade)}>
                      {result.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={result.is_passed ? "default" : "destructive"}
                    >
                      {result.is_passed ? "Passed" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatScorePercentage(result.completion_percentage)}
                  </TableCell>
                  <TableCell>
                    {new Date(result.calculated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/results/${result.attempt_id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleCalculateResult(result.attempt_id)
                          }
                          disabled={calculateResult.isPending}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Recalculate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
