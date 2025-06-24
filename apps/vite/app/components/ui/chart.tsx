import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { formatScore } from "~/lib/utils/score";

interface ChartData {
  type: "bar" | "line" | "radar";
  title: string;
  data: any[];
  description?: string;
  origin: "individual" | "session";
}

interface SimpleBarChartProps {
  data: Array<{
    test?: string;
    module?: string;
    score?: number;
    completion?: number;
    completion_rate?: number;
    average_score?: number;
  }>;
  title: string;
  description?: string;
  origin: "individual" | "session";
}

interface SimpleLineChartProps {
  data: Array<{
    range?: string;
    count?: number;
    trait?: string;
    score?: number;
  }>;
  title: string;
  description?: string;
  origin: "individual" | "session";
}

interface SimpleRadarChartProps {
  data: Array<{
    trait: string;
    score: number;
  }>;
  title: string;
  description?: string;
  origin: "individual" | "session";
}

interface ChartContainerProps {
  chart: ChartData;
  origin: "individual" | "session";
}

export function SimpleBarChart({
  data,
  title,
  description,
  origin,
}: SimpleBarChartProps) {
  // Transform data to ensure consistent field names

  const transformedData = data.map((item) => {
    return {
      name:
        origin === "individual"
          ? item.test
          : origin === "session"
            ? item.module
            : "Unknown",
      score:
        origin === "individual"
          ? formatScore(item.score)
          : origin === "session"
            ? formatScore(item.average_score)
            : 0,
      completion:
        origin === "individual"
          ? item.completion
          : origin === "session"
            ? item.completion_rate
            : 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={transformedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, overflow: "hidden", width: 100 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid gray",
                borderRadius: "6px",
                fontSize: "10px",
              }}
            />
            <Legend />
            <Bar
              dataKey="score"
              fill="#3b82f6"
              name={origin === "individual" ? "Skor" : "Rata-rata Skor"}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="completion"
              fill="#10b981"
              name="Penyelesaian (%)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SimpleLineChart({
  data,
  title,
  description,
  origin,
}: SimpleLineChartProps) {
  // Transform data for line chart
  const transformedData = data.map((item, index) => ({
    name:
      origin === "session"
        ? item.range
        : origin === "individual"
          ? item.trait
          : `Point ${index + 1}`,
    value:
      origin === "session"
        ? item.count
        : origin === "individual"
          ? formatScore(item.score)
          : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={transformedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#8b5cf6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SimpleRadarChart({
  data,
  title,
  description,
  origin,
}: SimpleRadarChartProps) {
  // Transform data for radar chart - data already comes in the correct format
  const transformedData = data.map((item) => ({
    trait: item.trait,
    value: Math.round(item.score * 10) / 10, // Round to 1 decimal place
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart
            data={transformedData}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
          >
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis
              dataKey="trait"
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              className="text-xs"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickCount={6}
            />
            <Radar
              name="Percentage"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 1, r: 4 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Persentase"]}
              labelFormatter={(label: string) => `Trait: ${label}`}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ChartContainer({ chart, origin }: ChartContainerProps) {
  if (chart.type === "bar") {
    return (
      <SimpleBarChart
        data={chart.data}
        title={chart.title}
        description={chart.description}
        origin={origin}
      />
    );
  }

  if (chart.type === "line") {
    return (
      <SimpleLineChart
        data={chart.data}
        title={chart.title}
        description={chart.description}
        origin={origin}
      />
    );
  }

  if (chart.type === "radar") {
    return (
      <SimpleRadarChart
        data={chart.data}
        title={chart.title}
        description={chart.description}
        origin={origin}
      />
    );
  }

  return null;
}
