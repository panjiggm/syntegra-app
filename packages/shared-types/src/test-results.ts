import { z } from "zod";
import { ReportErrorResponse } from "./report";

// ==================== REQUEST SCHEMAS ====================

export const GetTestResultsReportQuerySchema = z.object({
  period_type: z
    .enum(["today", "this_week", "this_month", "last_month", "this_year", "custom"])
    .optional()
    .default("this_month"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  position: z.string().optional(),
  session_id: z.string().uuid().optional(),
});

// ==================== RESPONSE TYPES ====================

export interface GetTestResultsReportQuery {
  period_type: "today" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
  position?: string;
  session_id?: string;
}

export interface TestResultsReportPeriod {
  type: "today" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";
  start_date: string;
  end_date: string;
  label: string;
}

export interface TestResultsReportSummary {
  total_sessions: number;
  total_participants: number;
  total_completed: number;
  completion_rate: number;
  average_score: number;
  grade_distribution: {
    [grade: string]: number;
  };
}

export interface TestResultsReportSession {
  session_id: string;
  session_code: string;
  session_name: string;
  date: string;
  time: string;
  target_position: string;
  location: string | null;
  proctor_name: string | null;
  total_participants: number;
  completed_participants: number;
  completion_rate: number;
  average_score: number;
  average_duration_minutes: number;
  test_modules: string;
}

export interface TestResultsReportParticipant {
  session_code: string;
  session_name: string;
  nik: string | null;
  name: string;
  gender: string;
  age: number | null;
  education: string;
  total_score: number;
  overall_grade: string;
  overall_percentile: number;
  completion_rate: number;
  duration_minutes: number;
  status: string;
  recommended_position: string;
  compatibility_score: number;
  primary_traits: string;
}

export interface TestResultsReportPositionSummary {
  target_position: string;
  total_participants: number;
  completed: number;
  completion_rate: number;
  average_score: number;
  grade_A: number;
  grade_B: number;
  grade_C: number;
  grade_D: number;
}

export interface TestResultsReportModuleSummary {
  test_name: string;
  category: string;
  total_attempts: number;
  average_score: number;
  completion_rate: number;
}

export interface TestResultsReportData {
  period: TestResultsReportPeriod;
  summary: TestResultsReportSummary;
  sessions: TestResultsReportSession[];
  participants: TestResultsReportParticipant[];
  position_summary: TestResultsReportPositionSummary[];
  test_module_summary: TestResultsReportModuleSummary[];
  generated_at: string;
}

export interface GetTestResultsReportResponse {
  success: true;
  message: string;
  data: TestResultsReportData;
}

// ==================== EXPORT TYPES ====================

export type TestResultsReportResponse =
  | GetTestResultsReportResponse
  | ReportErrorResponse;
