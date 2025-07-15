import { Context } from "hono";
import { eq, and, asc, gte, lte } from "drizzle-orm";
import { getDbFromEnv, testSessions } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Session Area Data Point Interface
interface SessionAreaDataPoint {
  month: string;
  year: number;
  value: number;
  label: string;
  fullMonth: string;
}

// Session Area Response Interface
interface SessionAreaResponse {
  success: true;
  message: string;
  data: {
    period: "monthly";
    range: "1y";
    total_sessions: number;
    data_points: SessionAreaDataPoint[];
    summary: {
      average_per_month: number;
      total_change: number;
      percentage_change: number;
      trend_direction: "up" | "down" | "stable";
      peak_month: string;
      peak_value: number;
      lowest_month: string;
      lowest_value: number;
    };
    year_info: {
      start_date: string;
      end_date: string;
      months_covered: number;
    };
  };
  timestamp: string;
}

export async function getSessionAreaHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Calculate date range for the last 12 months
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all sessions within the last 12 months
    const sessions = await db
      .select({
        created_at: testSessions.created_at,
        id: testSessions.id,
        session_name: testSessions.session_name,
      })
      .from(testSessions)
      .where(
        and(
          gte(testSessions.created_at, oneYearAgo),
          lte(testSessions.created_at, endOfCurrentMonth)
        )
      )
      .orderBy(asc(testSessions.created_at));

    // Group sessions by month
    const monthlyData: Record<string, number> = {};
    
    sessions.forEach((session) => {
      const date = new Date(session.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Generate complete 12-month data points (fill missing months with 0)
    const dataPoints: SessionAreaDataPoint[] = [];
    const currentDate = new Date(oneYearAgo);
    
    while (currentDate <= endOfCurrentMonth) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      const value = monthlyData[monthKey] || 0;
      
      dataPoints.push({
        month: monthKey,
        year,
        value,
        label: currentDate.toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        fullMonth: currentDate.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calculate summary statistics
    const totalSessions = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const averagePerMonth = dataPoints.length > 0 ? totalSessions / dataPoints.length : 0;

    // Find peak and lowest months
    const peakPoint = dataPoints.reduce((max, point) => 
      point.value > max.value ? point : max,
      dataPoints[0] || { value: 0, month: "", label: "" }
    );

    const lowestPoint = dataPoints.reduce((min, point) => 
      point.value < min.value ? point : min,
      dataPoints[0] || { value: 0, month: "", label: "" }
    );

    // Calculate trend direction (compare first half vs second half)
    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;
    
    const totalChange = secondHalfAvg - firstHalfAvg;
    const percentageChange = firstHalfAvg > 0 ? (totalChange / firstHalfAvg) * 100 : 0;
    
    let trendDirection: "up" | "down" | "stable" = "stable";
    if (Math.abs(percentageChange) > 5) { // 5% threshold
      trendDirection = percentageChange > 0 ? "up" : "down";
    }

    const response: SessionAreaResponse = {
      success: true,
      message: "Session area chart data retrieved successfully",
      data: {
        period: "monthly",
        range: "1y",
        total_sessions: totalSessions,
        data_points: dataPoints,
        summary: {
          average_per_month: Math.round(averagePerMonth * 100) / 100,
          total_change: Math.round(totalChange * 100) / 100,
          percentage_change: Math.round(percentageChange * 100) / 100,
          trend_direction: trendDirection,
          peak_month: peakPoint.month,
          peak_value: peakPoint.value,
          lowest_month: lowestPoint.month,
          lowest_value: lowestPoint.value,
        },
        year_info: {
          start_date: oneYearAgo.toISOString().split("T")[0],
          end_date: endOfCurrentMonth.toISOString().split("T")[0],
          months_covered: dataPoints.length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting session area data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve session area data",
        errors: [
          {
            message: error instanceof Error ? error.message : "Unknown error occurred",
            code: "INTERNAL_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}