import { Context } from "hono";
import { eq, and, asc, gte, lte } from "drizzle-orm";
import { getDbFromEnv, testAttempts, tests } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  GetTrendLineQuerySchema,
  type GetTrendLineResponseSchema,
  type TrendDataPoint,
  type GetTrendLineResponse,
} from "shared-types";

export async function getTrendLineHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Parse and validate query parameters
    const queryParams = c.req.queries();
    const parsedQuery = GetTrendLineQuerySchema.safeParse({
      period: queryParams.period?.[0] || "daily",
      range: queryParams.range?.[0] || "30d",
      test_id: queryParams.test_id?.[0],
      category: queryParams.category?.[0],
      module_type: queryParams.module_type?.[0],
      date_from: queryParams.date_from?.[0],
      date_to: queryParams.date_to?.[0],
    });

    if (!parsedQuery.success) {
      return c.json(
        {
          success: false,
          message: "Invalid query parameters",
          errors: parsedQuery.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: "VALIDATION_ERROR",
          })),
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const query = parsedQuery.data;

    // Calculate date range
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = query.date_to ? new Date(query.date_to) : now;

    if (query.date_from) {
      dateFrom = new Date(query.date_from);
    } else {
      // Calculate date range based on 'range' parameter
      const daysMap = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      };
      const days = daysMap[query.range];
      dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Build where conditions
    let whereConditions = [
      gte(testAttempts.created_at, dateFrom),
      lte(testAttempts.created_at, dateTo),
    ];

    // Simple approach: just get all data and process in JavaScript
    let baseQuery: any = db
      .select({
        created_at: testAttempts.created_at,
        id: testAttempts.id,
      })
      .from(testAttempts);

    // Add test join and filters if specified
    if (query.test_id || query.category || query.module_type) {
      baseQuery = baseQuery.leftJoin(tests, eq(testAttempts.test_id, tests.id));

      if (query.test_id) {
        whereConditions.push(eq(tests.id, query.test_id));
      }

      if (query.category) {
        whereConditions.push(
          eq(
            tests.category,
            query.category as
              | "wais"
              | "mbti"
              | "wartegg"
              | "riasec"
              | "kraepelin"
              | "pauli"
              | "big_five"
              | "papi_kostick"
              | "dap"
              | "raven"
              | "epps"
              | "army_alpha"
              | "htp"
              | "disc"
              | "iq"
              | "eq"
          )
        );
      }

      if (query.module_type) {
        whereConditions.push(
          eq(
            tests.module_type,
            query.module_type as
              | "intelligence"
              | "personality"
              | "aptitude"
              | "interest"
              | "projective"
              | "cognitive"
          )
        );
      }
    }

    // Apply all where conditions
    baseQuery = baseQuery.where(and(...whereConditions));

    // Execute the query
    const results = await baseQuery.orderBy(asc(testAttempts.created_at));

    // Process raw results and group by period in JavaScript
    const processResults = (
      rawResults: any[]
    ): Array<{ date: string; count: number }> => {
      const groupedData: Record<string, number> = {};

      rawResults.forEach((result) => {
        const date = new Date(result.created_at);
        let dateKey: string;

        switch (query.period) {
          case "daily":
            dateKey = date.toISOString().split("T")[0];
            break;
          case "weekly":
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            dateKey = `${year}-W${week.toString().padStart(2, "0")}`;
            break;
          case "monthly":
            dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
            break;
          default:
            dateKey = date.toISOString().split("T")[0];
        }

        groupedData[dateKey] = (groupedData[dateKey] || 0) + 1;
      });

      return Object.entries(groupedData).map(([date, count]) => ({
        date,
        count,
      }));
    };

    // Fill in missing dates with zero values
    const fillMissingDates = (
      data: Array<{ date: string; count: number }>,
      period: string,
      startDate: Date,
      endDate: Date
    ): TrendDataPoint[] => {
      const filledData: TrendDataPoint[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        let dateKey: string;
        let label: string;

        switch (period) {
          case "daily":
            dateKey = currentDate.toISOString().split("T")[0];
            label = currentDate.toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
            });
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case "weekly":
            const year = currentDate.getFullYear();
            const week = getWeekNumber(currentDate);
            dateKey = `${year}-W${week.toString().padStart(2, "0")}`;
            label = `Week ${week}`;
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case "monthly":
            dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;
            label = currentDate.toLocaleDateString("id-ID", {
              month: "short",
              year: "numeric",
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            dateKey = currentDate.toISOString().split("T")[0];
            label = currentDate.toLocaleDateString("id-ID");
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const existingData = data.find((d) => d.date === dateKey);
        filledData.push({
          date: dateKey,
          value: existingData?.count || 0,
          label: label,
        });
      }

      return filledData;
    };

    // Helper function to get week number
    function getWeekNumber(date: Date): number {
      const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
    }

    // Process results
    const processedResults = processResults(results);
    const dataPoints = fillMissingDates(
      processedResults,
      query.period,
      dateFrom,
      dateTo
    );

    // Calculate summary statistics
    const totalCount = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const averagePerPeriod =
      dataPoints.length > 0 ? totalCount / dataPoints.length : 0;

    // Find peak
    const peakPoint = dataPoints.reduce(
      (max, point) => (point.value > max.value ? point : max),
      dataPoints[0] || { value: 0, date: "", label: "" }
    );

    // Calculate trend direction
    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

    const totalChange = secondHalfAvg - firstHalfAvg;
    const percentageChange =
      firstHalfAvg > 0 ? (totalChange / firstHalfAvg) * 100 : 0;

    let trendDirection: "up" | "down" | "stable" = "stable";
    if (Math.abs(percentageChange) > 5) {
      // 5% threshold
      trendDirection = percentageChange > 0 ? "up" : "down";
    }

    const response: GetTrendLineResponse = {
      success: true,
      message: "Trend line data retrieved successfully",
      data: {
        period: query.period,
        range: query.range,
        total_count: totalCount,
        data_points: dataPoints,
        summary: {
          average_per_period: Math.round(averagePerPeriod * 100) / 100,
          total_change: Math.round(totalChange * 100) / 100,
          percentage_change: Math.round(percentageChange * 100) / 100,
          trend_direction: trendDirection,
          peak_date: peakPoint.date,
          peak_value: peakPoint.value,
        },
        filters_applied: {
          test_id: query.test_id,
          category: query.category,
          module_type: query.module_type,
          date_from: dateFrom.toISOString().split("T")[0],
          date_to: dateTo.toISOString().split("T")[0],
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting trend line data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve trend line data",
        errors: [
          {
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
            code: "INTERNAL_ERROR",
          },
        ],
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}
