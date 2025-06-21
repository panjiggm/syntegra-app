import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  Calculator, 
  Clock, 
  Target, 
  TrendingUp, 
  User, 
  RefreshCw,
  BarChart3 
} from "lucide-react";
import { 
  useCalculateTestResult, 
  useRecalculateScores,
  getRecommendationColor,
  getGradeDescription,
  formatScorePercentage 
} from "~/hooks/use-results";
import type { TestResult } from "~/hooks/use-results";

interface TestResultCardProps {
  attemptId: string;
  result?: TestResult;
  showCalculateButton?: boolean;
  onResultCalculated?: (result: TestResult) => void;
}

export function TestResultCard({ 
  attemptId, 
  result, 
  showCalculateButton = true,
  onResultCalculated 
}: TestResultCardProps) {
  const calculateResult = useCalculateTestResult();
  const recalculateScores = useRecalculateScores();

  const handleCalculateResult = async () => {
    try {
      const response = await calculateResult.mutateAsync({
        attempt_id: attemptId,
        force_recalculate: !!result,
        calculation_options: {
          include_personality_analysis: true,
          include_intelligence_scoring: true,
          include_recommendations: true,
        },
      });
      
      if (onResultCalculated) {
        onResultCalculated(response.data.result);
      }
    } catch (error) {
      console.error('Failed to calculate result:', error);
    }
  };

  const handleRecalculateScores = async () => {
    try {
      await recalculateScores.mutateAsync(attemptId);
      // After recalculating scores, calculate the result
      await handleCalculateResult();
    } catch (error) {
      console.error('Failed to recalculate scores:', error);
    }
  };

  if (!result && !showCalculateButton) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No result available
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Test Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Calculate detailed result with personality analysis and recommendations.
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRecalculateScores}
              disabled={recalculateScores.isPending}
              variant="outline"
              size="sm"
            >
              {recalculateScores.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Recalculate Scores
            </Button>
            
            <Button 
              onClick={handleCalculateResult}
              disabled={calculateResult.isPending}
            >
              {calculateResult.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              Calculate Result
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Result Overview
            </div>
            {showCalculateButton && (
              <Button 
                onClick={handleCalculateResult}
                disabled={calculateResult.isPending}
                variant="outline"
                size="sm"
              >
                {calculateResult.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Recalculate
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <User className="h-8 w-8 text-gray-600" />
            <div>
              <div className="font-medium">{result.user.name}</div>
              <div className="text-sm text-gray-600">{result.user.email}</div>
              {result.user.nik && (
                <div className="text-sm text-gray-500">NIK: {result.user.nik}</div>
              )}
            </div>
          </div>

          {/* Test Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatScorePercentage(result.scaled_score)}
              </div>
              <div className="text-sm text-blue-600">Final Score</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className={`text-2xl font-bold ${getRecommendationColor(result.grade)}`}>
                {result.grade}
              </div>
              <div className="text-sm text-gray-600">{getGradeDescription(result.grade)}</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatScorePercentage(result.completion_percentage)}
              </div>
              <div className="text-sm text-purple-600">Completion</div>
            </div>
          </div>

          {/* Pass/Fail Status */}
          <div className="flex items-center justify-center">
            <Badge 
              variant={result.is_passed ? "default" : "destructive"}
              className="text-sm px-4 py-2"
            >
              {result.is_passed ? "PASSED" : "FAILED"}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{result.detailed_analysis?.answered_questions}/{result.detailed_analysis?.total_questions} questions</span>
            </div>
            <Progress value={result.completion_percentage} className="h-2" />
          </div>

          {/* Detailed Stats */}
          {result.detailed_analysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {result.detailed_analysis.correct_answers}
                </div>
                <div className="text-xs text-gray-600">Correct</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {formatScorePercentage(result.detailed_analysis.accuracy_rate)}
                </div>
                <div className="text-xs text-gray-600">Accuracy</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  {formatScorePercentage(result.detailed_analysis.time_efficiency)}
                </div>
                <div className="text-xs text-gray-600">Time Efficiency</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {result.attempt.time_spent ? Math.round(result.attempt.time_spent / 60) : 0}m
                </div>
                <div className="text-xs text-gray-600">Time Spent</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {result.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{result.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{result.recommendations}</p>
          </CardContent>
        </Card>
      )}

      {/* Personality Traits (for personality tests) */}
      {result.traits && result.traits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personality Traits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.traits.map((trait, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{trait.name}</h4>
                    <Badge variant="outline">{trait.score}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{trait.description}</p>
                  <Progress value={trait.score} className="mt-2 h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Test Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Test Name</label>
              <div>{result.test.name}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Category</label>
              <div className="capitalize">{result.test.category}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Module Type</label>
              <div className="capitalize">{result.test.module_type}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Time Limit</label>
              <div>{result.test.time_limit} minutes</div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600">
              Calculated: {new Date(result.calculated_at).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}