import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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
            data={chart.data.datasets[0].data.map((value: number, index: number) => ({
              name: chart.data.labels[index],
              correct: chart.data.datasets[0].data[index],
              incorrect: chart.data.datasets[1].data[index],
            }))}
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
                Participants ({reportData.participants.length})
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <Calendar className="h-4 w-4 mr-1" />
                Sessions ({reportData.sessions.length})
              </TabsTrigger>
              <TabsTrigger value="positions">
                <Target className="h-4 w-4 mr-1" />
                Positions ({reportData.position_summary.length})
              </TabsTrigger>
              <TabsTrigger value="modules">
                <BookOpen className="h-4 w-4 mr-1" />
                Modules ({reportData.test_module_summary.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Participants with Charts:</h4>
                
                {/* Participants List with Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  {reportData.participants.slice(0, 5).map((participant: any, index: number) => (
                    <AccordionItem key={index} value={`participant-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <div className="text-2xl">
                            {participant.gender === 'Laki-laki' ? '👨' : participant.gender === 'Perempuan' ? '👩' : '🧑'}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="font-medium truncate">{participant.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Score: {participant.total_score} | Grade: {participant.overall_grade} | 
                              Tests: {participant.tests?.length || 0}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {participant.tests?.map((test: any, testIndex: number) => (
                              <div
                                key={testIndex}
                                className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800"
                              >
                                📝 {test.test_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4 space-y-4">
                          {/* Participant Details */}
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                            <div>
                              <div className="text-sm font-medium">Session</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.session_code} - {participant.session_name}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">NIK</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.nik}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Age</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.age} years
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Education</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.education}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Duration</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.duration_minutes} minutes
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Status</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.status}
                              </div>
                            </div>
                          </div>

                          {/* Tests with Charts */}
                          {participant.tests && participant.tests.length > 0 && (
                            <div className="space-y-4">
                              <h5 className="font-medium flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Tests & Charts
                              </h5>
                              <div className="space-y-4">
                                {participant.tests.map((test: any, testIndex: number) => (
                                  <Card key={testIndex}>
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-sm">
                                        📝 {test.test_name}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {test.charts && test.charts.length > 0 ? (
                                        <div className="grid gap-4">
                                          {test.charts.map((chart: any, chartIndex: number) => (
                                            <Card key={chartIndex} className="border-dashed">
                                              <CardHeader className="pb-2">
                                                <CardTitle className="text-xs">
                                                  {chart.type === 'bar' ? '📊' : '🎯'} {chart.question_type.replace('_', ' ').toUpperCase()} Chart
                                                </CardTitle>
                                              </CardHeader>
                                              <CardContent>
                                                <ParticipantChart chart={chart} />
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-muted-foreground">
                                          No charts available for this test
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {reportData.participants.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {reportData.participants.length - 5} more participants
                  </p>
                )}

                {/* Raw JSON for debugging */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">View Raw Data</summary>
                  <div className="bg-muted/50 p-3 rounded-md mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(
                        reportData.participants.slice(0, 2),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </details>
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Sample Sessions:</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(reportData.sessions.slice(0, 3), null, 2)}
                  </pre>
                </div>
                {reportData.sessions.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    ... and {reportData.sessions.length - 3} more sessions
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="positions" className="mt-4">
              <div className="space-y-2">
                <h4 className="font-medium">Position Summary:</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(reportData.position_summary, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modules" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Test Module Summary:</h4>
                
                {/* Module List with Icons */}
                <div className="space-y-2">
                  {reportData.test_module_summary.map((module: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-md bg-card">
                      <div className="text-2xl">{module.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{module.test_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Category: {module.category} | Attempts: {module.total_attempts} | 
                          Avg Score: {module.average_score} | Completion: {module.completion_rate}%
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          {module.category}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Raw JSON for debugging */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">View Raw Data</summary>
                  <div className="bg-muted/50 p-3 rounded-md mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(reportData.test_module_summary, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
