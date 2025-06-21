import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '~/lib/api-client';

// Types (should be imported from shared-types when available)
interface CalculateTestResultRequest {
  attempt_id?: string;
  result_id?: string;
  force_recalculate?: boolean;
  calculation_options?: {
    include_personality_analysis?: boolean;
    include_intelligence_scoring?: boolean;
    include_recommendations?: boolean;
  };
}

interface TestResult {
  id: string;
  attempt_id: string;
  user_id: string;
  test_id: string;
  raw_score: number;
  scaled_score: number;
  percentile: number;
  grade: string;
  traits?: Array<{
    name: string;
    score: number;
    description: string;
    category: string;
  }>;
  trait_names?: string[];
  description: string;
  recommendations?: string;
  detailed_analysis?: {
    calculation_method: string;
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
    accuracy_rate: number;
    time_efficiency: number;
    scoring_breakdown: Array<{
      trait: string;
      raw_score: number;
      scaled_score: number;
      percentile: number;
    }>;
  };
  is_passed: boolean;
  completion_percentage: number;
  calculated_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    nik: string;
  };
  test: {
    id: string;
    name: string;
    category: string;
    module_type: string;
    time_limit: number;
    total_questions: number;
    passing_score?: number;
  };
  attempt: {
    id: string;
    start_time: string;
    end_time: string;
    actual_end_time?: string;
    status: string;
    time_spent?: number;
    questions_answered: number;
  };
}

interface CalculateTestResultResponse {
  success: true;
  message: string;
  data: {
    result: TestResult;
    calculation_details: {
      calculation_method: string;
      raw_answers_processed: number;
      scores_calculated: Array<{
        trait: string;
        raw_score: number;
        scaled_score: number;
        percentile: number;
      }>;
      processing_time_ms: number;
      recalculated: boolean;
    };
  };
  timestamp: string;
}

// Hooks
export function useCalculateTestResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CalculateTestResultRequest): Promise<CalculateTestResultResponse> => {
      const response = await apiClient.post('/api/v1/results/calculate', request);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['test-results'] });
      queryClient.invalidateQueries({ 
        queryKey: ['test-result', data.data.result.attempt_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['user-results', data.data.result.user_id] 
      });
    },
  });
}

export function useGetTestResult(attemptId: string) {
  return useQuery({
    queryKey: ['test-result', attemptId],
    queryFn: async (): Promise<TestResult> => {
      const response = await apiClient.get(`/api/v1/results/attempt/${attemptId}`);
      return response.data.data;
    },
    enabled: !!attemptId,
  });
}

export function useGetUserResults(userId: string) {
  return useQuery({
    queryKey: ['user-results', userId],
    queryFn: async (): Promise<TestResult[]> => {
      const response = await apiClient.get(`/api/v1/results/user/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

export function useRecalculateScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptId: string) => {
      const response = await apiClient.post(`/api/v1/attempts/${attemptId}/answers/recalculate-scores`);
      return response.data;
    },
    onSuccess: (_, attemptId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['test-result', attemptId] });
      queryClient.invalidateQueries({ queryKey: ['answers', attemptId] });
    },
  });
}

// Utility functions
export function getRecommendationColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-yellow-600';
    case 'D': return 'text-orange-600';
    case 'E': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Below Average';
    case 'E': return 'Poor';
    default: return 'Not Available';
  }
}

export function formatScorePercentage(score: number): string {
  return `${Math.round(score)}%`;
}

export function getPersonalityRadarData(traits?: TestResult['traits']) {
  if (!traits || traits.length === 0) return [];
  
  return traits.map(trait => ({
    trait: trait.name,
    score: trait.score,
    fullMark: 100,
    description: trait.description,
  }));
}