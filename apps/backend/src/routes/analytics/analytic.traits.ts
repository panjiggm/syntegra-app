import { Context } from "hono";
import { eq, and, count, sql, gte, lte } from "drizzle-orm";
import { getDbFromEnv, tests, testResults, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type TraitAnalyticsQuery,
  type TraitAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
} from "shared-types";

export async function getTraitAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: TraitAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      trait_name: rawQuery.trait_name,
      test_id: rawQuery.test_id,
      include_correlations: rawQuery.include_correlations === "true",
      include_distribution: rawQuery.include_distribution !== "false",
      group_by: (rawQuery.group_by as any) || "trait",
    };

    // Get date range
    const { from, to } =
      queryParams.date_from && queryParams.date_to
        ? {
            from: new Date(queryParams.date_from),
            to: new Date(queryParams.date_to),
          }
        : getAnalyticsDateRange(queryParams.period);

    // Build filter conditions
    const filterConditions: any[] = [
      gte(testResults.calculated_at, from),
      lte(testResults.calculated_at, to),
    ];

    if (queryParams.test_id) {
      filterConditions.push(eq(testResults.test_id, queryParams.test_id));
    }

    // Get trait summary statistics
    const [totalTraitMeasurements] = await db
      .select({ count: count() })
      .from(testResults)
      .where(and(...filterConditions, sql`${testResults.traits} IS NOT NULL`));

    // Get all results with traits for analysis
    const resultsWithTraits = await db
      .select({
        id: testResults.id,
        test_id: testResults.test_id,
        user_id: testResults.user_id,
        traits: testResults.traits,
        scaled_score: testResults.scaled_score,
        calculated_at: testResults.calculated_at,
        test_category: tests.category,
        user_gender: users.gender,
        user_education: users.education,
        user_birth_date: users.birth_date,
      })
      .from(testResults)
      .leftJoin(tests, eq(testResults.test_id, tests.id))
      .leftJoin(users, eq(testResults.user_id, users.id))
      .where(and(...filterConditions, sql`${testResults.traits} IS NOT NULL`))
      .limit(1000); // Limit for performance

    // Process traits data
    const allTraits: Array<{
      name: string;
      score: number;
      category: string;
      test_category: string;
      user_gender: string | null;
      user_education: string | null;
      age_group: string | null;
    }> = [];

    const traitCounts = new Map<string, number>();
    const traitScores = new Map<string, number[]>();

    resultsWithTraits.forEach((result) => {
      if (!result.traits) return;

      let traits: any[] = [];
      try {
        if (Array.isArray(result.traits)) {
          traits = result.traits;
        } else if (typeof result.traits === "string") {
          traits = JSON.parse(result.traits);
        } else {
          traits = result.traits as any[];
        }
      } catch (error) {
        console.warn("Failed to parse traits:", error);
        return;
      }

      // Calculate age group
      let ageGroup = "Unknown";
      if (result.user_birth_date) {
        const age =
          new Date().getFullYear() - result.user_birth_date.getFullYear();
        if (age < 20) ageGroup = "Under 20";
        else if (age <= 25) ageGroup = "20-25";
        else if (age <= 30) ageGroup = "26-30";
        else if (age <= 35) ageGroup = "31-35";
        else if (age <= 40) ageGroup = "36-40";
        else if (age <= 50) ageGroup = "41-50";
        else ageGroup = "Over 50";
      }

      traits.forEach((trait) => {
        if (trait.name && typeof trait.score === "number") {
          // Filter by trait name if specified
          if (queryParams.trait_name && trait.name !== queryParams.trait_name) {
            return;
          }

          allTraits.push({
            name: trait.name,
            score: trait.score,
            category: trait.category || "Unknown",
            test_category: result.test_category || "Unknown",
            user_gender: result.user_gender,
            user_education: result.user_education,
            age_group: ageGroup,
          });

          // Count occurrences
          traitCounts.set(trait.name, (traitCounts.get(trait.name) || 0) + 1);

          // Collect scores for statistics
          if (!traitScores.has(trait.name)) {
            traitScores.set(trait.name, []);
          }
          traitScores.get(trait.name)!.push(trait.score);
        }
      });
    });

    // Calculate trait summary
    const uniqueTraits = traitCounts.size;
    const mostCommonTraits = Array.from(traitCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    const averageTraitScore =
      allTraits.length > 0
        ? allTraits.reduce((sum, trait) => sum + trait.score, 0) /
          allTraits.length
        : 0;

    // Calculate trait diversity index (Simpson's diversity index)
    const totalTraits = allTraits.length;
    let diversityIndex = 0;
    if (totalTraits > 0) {
      const probabilities = Array.from(traitCounts.values()).map(
        (count) => count / totalTraits
      );
      diversityIndex = 1 - probabilities.reduce((sum, p) => sum + p * p, 0);
    }

    const traitSummary = {
      total_trait_measurements: totalTraitMeasurements.count,
      unique_traits: uniqueTraits,
      most_common_traits: mostCommonTraits,
      average_trait_score: Math.round(averageTraitScore * 100) / 100,
      trait_diversity_index: Math.round(diversityIndex * 100) / 100,
    };

    // Get trait distribution if requested
    let traitDistribution = undefined;
    if (queryParams.include_distribution) {
      traitDistribution = Array.from(traitScores.entries())
        .map(([traitName, scores]) => {
          if (scores.length === 0) return null;

          scores.sort((a, b) => a - b);
          const count = scores.length;
          const sum = scores.reduce((a, b) => a + b, 0);
          const mean = sum / count;
          const variance =
            scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) /
            count;
          const standardDeviation = Math.sqrt(variance);

          // Calculate percentiles
          const percentile25 = scores[Math.floor(count * 0.25)];
          const percentile50 = scores[Math.floor(count * 0.5)];
          const percentile75 = scores[Math.floor(count * 0.75)];

          // Create score distribution (ranges)
          const scoreRanges = {
            "0-20": 0,
            "21-40": 0,
            "41-60": 0,
            "61-80": 0,
            "81-100": 0,
          };

          scores.forEach((score) => {
            if (score <= 20) scoreRanges["0-20"]++;
            else if (score <= 40) scoreRanges["21-40"]++;
            else if (score <= 60) scoreRanges["41-60"]++;
            else if (score <= 80) scoreRanges["61-80"]++;
            else scoreRanges["81-100"]++;
          });

          // Get trait category
          const traitCategory =
            allTraits.find((t) => t.name === traitName)?.category || "Unknown";

          return {
            trait_name: traitName,
            trait_category: traitCategory,
            total_measurements: count,
            average_score: Math.round(mean * 100) / 100,
            min_score: Math.min(...scores),
            max_score: Math.max(...scores),
            standard_deviation: Math.round(standardDeviation * 100) / 100,
            percentile_25: percentile25,
            percentile_50: percentile50,
            percentile_75: percentile75,
            score_distribution: scoreRanges,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 20); // Top 20 traits
    }

    // Get correlations if requested
    let correlations = undefined;
    if (queryParams.include_correlations && allTraits.length > 0) {
      correlations = [];
      const traitNames = Array.from(traitScores.keys()).slice(0, 10); // Limit for performance

      for (let i = 0; i < traitNames.length; i++) {
        for (let j = i + 1; j < traitNames.length; j++) {
          const trait1 = traitNames[i];
          const trait2 = traitNames[j];

          // Get paired scores for correlation calculation
          const pairedScores: Array<[number, number]> = [];

          // Simple approach: find results that have both traits
          resultsWithTraits.forEach((result) => {
            if (!result.traits) return;

            let traits: any[] = [];
            try {
              if (Array.isArray(result.traits)) {
                traits = result.traits;
              } else if (typeof result.traits === "string") {
                traits = JSON.parse(result.traits);
              } else {
                traits = result.traits as any[];
              }
            } catch {
              return;
            }

            const score1 = traits.find((t) => t.name === trait1)?.score;
            const score2 = traits.find((t) => t.name === trait2)?.score;

            if (typeof score1 === "number" && typeof score2 === "number") {
              pairedScores.push([score1, score2]);
            }
          });

          if (pairedScores.length >= 5) {
            // Minimum sample size
            // Calculate Pearson correlation coefficient
            const n = pairedScores.length;
            const sumX = pairedScores.reduce((sum, [x]) => sum + x, 0);
            const sumY = pairedScores.reduce((sum, [, y]) => sum + y, 0);
            const sumXY = pairedScores.reduce((sum, [x, y]) => sum + x * y, 0);
            const sumX2 = pairedScores.reduce((sum, [x]) => sum + x * x, 0);
            const sumY2 = pairedScores.reduce((sum, [, y]) => sum + y * y, 0);

            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt(
              (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
            );

            if (denominator !== 0) {
              const correlation = numerator / denominator;
              const significanceLevel =
                Math.abs(correlation) > 0.3 ? 0.05 : 0.1; // Simplified

              correlations.push({
                trait_1: trait1,
                trait_2: trait2,
                correlation_coefficient: Math.round(correlation * 1000) / 1000,
                significance_level: significanceLevel,
                sample_size: n,
              });
            }
          }
        }
      }

      // Sort by absolute correlation value and take top 10
      correlations.sort(
        (a, b) =>
          Math.abs(b.correlation_coefficient) -
          Math.abs(a.correlation_coefficient)
      );
      correlations = correlations.slice(0, 10);
    }

    // Get demographic breakdown if requested
    let demographicBreakdown = undefined;
    if (queryParams.group_by !== "trait" && allTraits.length > 0) {
      const byGender: Record<string, Record<string, number>> = {};
      const byEducation: Record<string, Record<string, number>> = {};
      const byAgeGroup: Record<string, Record<string, number>> = {};

      allTraits.forEach((trait) => {
        // By gender
        if (trait.user_gender) {
          if (!byGender[trait.user_gender]) byGender[trait.user_gender] = {};
          byGender[trait.user_gender][trait.name] =
            (byGender[trait.user_gender][trait.name] || 0) + 1;
        }

        // By education
        if (trait.user_education) {
          if (!byEducation[trait.user_education])
            byEducation[trait.user_education] = {};
          byEducation[trait.user_education][trait.name] =
            (byEducation[trait.user_education][trait.name] || 0) + 1;
        }

        // By age group
        if (trait.age_group && trait.age_group !== "Unknown") {
          if (!byAgeGroup[trait.age_group]) byAgeGroup[trait.age_group] = {};
          byAgeGroup[trait.age_group][trait.name] =
            (byAgeGroup[trait.age_group][trait.name] || 0) + 1;
        }
      });

      demographicBreakdown = {
        by_gender: byGender,
        by_education: byEducation,
        by_age_group: byAgeGroup,
      };
    }

    // Get trends
    let trends = undefined;
    const daysDiff = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    const maxPoints = Math.min(daysDiff, 30);

    trends = [];
    for (let i = 0; i < maxPoints; i++) {
      const date = new Date(
        from.getTime() + (i * (to.getTime() - from.getTime())) / maxPoints
      );
      const nextDate = new Date(
        from.getTime() + ((i + 1) * (to.getTime() - from.getTime())) / maxPoints
      );

      const dayResults = await db
        .select({
          traits: testResults.traits,
          scaled_score: testResults.scaled_score,
        })
        .from(testResults)
        .where(
          and(
            gte(testResults.calculated_at, date),
            lte(testResults.calculated_at, nextDate),
            sql`${testResults.traits} IS NOT NULL`,
            queryParams.test_id
              ? eq(testResults.test_id, queryParams.test_id)
              : undefined
          )
        );

      const dayTraits: Array<{ name: string; score: number }> = [];
      dayResults.forEach((result) => {
        if (!result.traits) return;

        try {
          let traits: any[] = [];
          if (Array.isArray(result.traits)) {
            traits = result.traits;
          } else if (typeof result.traits === "string") {
            traits = JSON.parse(result.traits);
          } else {
            traits = result.traits as any[];
          }

          traits.forEach((trait) => {
            if (trait.name && typeof trait.score === "number") {
              if (
                !queryParams.trait_name ||
                trait.name === queryParams.trait_name
              ) {
                dayTraits.push({ name: trait.name, score: trait.score });
              }
            }
          });
        } catch (error) {
          // Skip invalid trait data
        }
      });

      const uniqueTraitsInDay = new Set(dayTraits.map((t) => t.name)).size;
      const averageScore =
        dayTraits.length > 0
          ? dayTraits.reduce((sum, trait) => sum + trait.score, 0) /
            dayTraits.length
          : 0;

      trends.push({
        date: date.toISOString().split("T")[0],
        total_measurements: dayTraits.length,
        average_score: Math.round(averageScore * 100) / 100,
        unique_traits: uniqueTraitsInDay,
      });
    }

    const response: TraitAnalyticsResponse = {
      success: true,
      data: {
        trait_summary: traitSummary,
        trait_distribution: traitDistribution,
        correlations,
        demographic_breakdown: demographicBreakdown,
        trends,
        metadata: {
          total_records: totalTraitMeasurements.count,
          period_start: from.toISOString(),
          period_end: to.toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting trait analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve trait analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
