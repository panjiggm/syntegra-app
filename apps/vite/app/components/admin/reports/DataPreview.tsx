import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  Calendar,
  TrendingUp,
  Target,
  BookOpen,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import { formatScore } from "~/lib/utils/score";
import { format } from "date-fns";

interface DataPreviewProps {
  data: any;
}

// Component untuk menampilkan chart peserta
function ParticipantChart({ chart }: { chart: any }) {
  if (chart.type === "bar") {
    return (
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chart.data.datasets[0].data.map(
              (value: number, index: number) => ({
                name: chart.data.labels[index],
                correct: chart.data.datasets[0].data[index],
                incorrect: chart.data.datasets[1].data[index],
              })
            )}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="correct" fill="#22c55e" name="Benar" />
            <Bar dataKey="incorrect" fill="#ef4444" name="Salah" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "radar") {
    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chart.data.labels.map((label: string, index: number) => ({
              trait: label,
              value: chart.data.datasets[0].data[index],
            }))}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="trait" />
            <PolarRadiusAxis angle={90} domain={[0, 10]} />
            <Radar
              name="Rating"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return <div>Tipe chart tidak dikenali: {chart.type}</div>;
}

export function DataPreview({ data }: DataPreviewProps) {
  if (!data || !data.data) {
    return null;
  }

  const reportData = data.data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reportData.summary.total_sessions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Participants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportData.summary.total_participants}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Session Modules
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {reportData.summary.total_session_modules || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Test modules configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {reportData.summary.average_score?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">Overall average</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Period Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{reportData.period.type}</Badge>
              <span className="text-sm text-muted-foreground">
                {reportData.period.label}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">From:</span>{" "}
              {reportData.period.start_date}
              <span className="mx-2">•</span>
              <span className="font-medium">To:</span>{" "}
              {reportData.period.end_date}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Data Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="participants" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="participants">
                <Users className="h-4 w-4 mr-1" />
                Participants{" "}
                <Badge variant="default">
                  {reportData.participants.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <Calendar className="h-4 w-4 mr-1" />
                Sessions{" "}
                <Badge variant="default">{reportData.sessions.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="positions">
                <Target className="h-4 w-4 mr-1" />
                Positions{" "}
                <Badge variant="default">
                  {reportData.position_summary.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="modules">
                <BookOpen className="h-4 w-4 mr-1" />
                Modules{" "}
                <Badge variant="default">
                  {reportData.test_module_summary.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Participants with Charts:</h4>

                {/* Participants List with Accordion */}
                {reportData.participants.map(
                  (participant: any, index: number) => (
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-2xl">
                        {participant.gender === "Laki-laki"
                          ? "👨"
                          : participant.gender === "Perempuan"
                            ? "👩"
                            : "🧑"}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">
                          {participant.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Score:{" "}
                          <span className="font-bold text-gray-700">
                            {formatScore(participant.total_score)}
                          </span>{" "}
                          | Grade:{" "}
                          <span className="font-bold text-gray-700">
                            {participant.overall_grade}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1"></div>
                    </div>
                  )
                )}
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Sessions Overview:</h4>

                {/* Sessions Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Sesi Tes</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-center">
                        Jumlah Peserta
                      </TableHead>
                      <TableHead className="text-center">
                        Avg Duration
                      </TableHead>
                      {/* <TableHead className="text-center">Avg Score</TableHead> */}
                      <TableHead>Modul Tes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.sessions.map((session: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {session.session_name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(session.date), "dd MMMM yyyy")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            {session.total_participants}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs">
                            {session.average_duration_minutes?.toFixed(1) ||
                              "0.0"}
                            m
                          </span>
                        </TableCell>
                        {/* <TableCell className="text-center">
                          <span className="text-xs">
                            {session.average_score}
                          </span>
                        </TableCell> */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {session.test_modules
                              .split(", ")
                              .slice(0, 2)
                              .map((module: string, moduleIndex: number) => (
                                <Badge
                                  key={moduleIndex}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {module}
                                </Badge>
                              ))}
                            {session.test_modules.split(", ").length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{session.test_modules.split(", ").length - 2}{" "}
                                lainya
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="positions" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Position Summary:</h4>

                {/* Position Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reportData.position_summary.map(
                    (position: any, index: number) => (
                      <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium capitalize">
                            {position.target_position}
                          </CardTitle>
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-sky-600">
                            {position.total_participants}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total peserta
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {/* Empty State */}
                {reportData.position_summary.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No position data available
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="modules" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Test Module Summary:</h4>

                {/* Module List with Icons */}
                <div className="space-y-2">
                  {reportData.test_module_summary.map(
                    (module: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-md bg-card"
                      >
                        <div className="text-2xl">{module.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {module.test_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Percobaan:{" "}
                            <span className="font-bold text-gray-700">
                              {module.total_attempts}
                            </span>{" "}
                            | Avg Score:{" "}
                            <span className="font-bold text-gray-700">
                              {module.average_score}
                            </span>{" "}
                            | Penyelesaian:{" "}
                            <span className="font-bold text-gray-700">
                              {module.completion_rate}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <div className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                            {module.category}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
