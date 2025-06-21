import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Brain } from "lucide-react";
import type { TestResult } from "~/hooks/use-results";

interface PersonalityRadarChartProps {
  result: TestResult;
}

export function PersonalityRadarChart({ result }: PersonalityRadarChartProps) {
  if (!result.traits || result.traits.length === 0) {
    return null;
  }

  // For now, we'll show a simplified version without actual radar chart
  // You can integrate with libraries like recharts, chart.js, or d3 later
  const maxScore = Math.max(...result.traits.map(t => t.score));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Personality Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Radar Chart Placeholder */}
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <div className="text-sm">Radar Chart</div>
            <div className="text-xs">Integration with chart library needed</div>
          </div>
        </div>

        {/* Traits List */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Trait Scores</h4>
          <div className="space-y-3">
            {result.traits.map((trait, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{trait.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {trait.score}/{maxScore}
                  </Badge>
                </div>
                
                {/* Progress bar representing the score */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(trait.score / maxScore) * 100}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-600">{trait.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Personality Summary */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
          <div className="text-sm text-gray-700">
            Based on the {result.test.category.toUpperCase()} assessment, this profile shows:
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {result.trait_names?.map((traitName, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {traitName}
              </Badge>
            ))}
          </div>
        </div>

        {/* Chart Integration Notice */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> To display an interactive radar chart, integrate with a charting library like:
          </div>
          <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
            <li>Recharts (recommended for React)</li>
            <li>Chart.js with react-chartjs-2</li>
            <li>D3.js for custom visualizations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Example data structure for radar chart integration:
export function getRadarChartData(traits: TestResult['traits']) {
  if (!traits) return [];
  
  return traits.map(trait => ({
    trait: trait.name,
    score: trait.score,
    fullMark: 100, // or calculate max from all scores
  }));
}

// Example Recharts integration (commented out - add when recharts is installed):
/*
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export function PersonalityRadarChartWithRecharts({ result }: PersonalityRadarChartProps) {
  const data = getRadarChartData(result.traits);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Personality Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="trait" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
*/