import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// User Profile Chart Data Point Interface
interface UserProfileChartDataPoint {
  category: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// User Profile Chart Section Interface
interface UserProfileChartSection {
  type: "gender" | "education" | "religion";
  title: string;
  total_users: number;
  data_points: UserProfileChartDataPoint[];
  summary: {
    most_common: string;
    most_common_count: number;
    least_common: string;
    least_common_count: number;
    diversity_score: number;
  };
}

// User Profile Chart Response Interface
interface UserProfileChartResponse {
  success: true;
  message: string;
  data: {
    total_users: number;
    sections: UserProfileChartSection[];
    overall_summary: {
      total_participants: number;
      diversity_scores: {
        gender: number;
        education: number;
        religion: number;
        overall: number;
      };
      demographics_health: "Excellent" | "Good" | "Fair" | "Poor";
    };
  };
  timestamp: string;
}

// Gender colors mapping
const GENDER_COLORS: Record<string, string> = {
  male: "#3B82F6", // blue
  female: "#EC4899", // pink
  other: "#8B5CF6", // violet
};

// Gender display names
const GENDER_LABELS: Record<string, string> = {
  male: "Laki-laki",
  female: "Perempuan",
  other: "Lainnya",
};

// Education colors mapping
const EDUCATION_COLORS: Record<string, string> = {
  sd: "#EF4444", // red
  smp: "#F59E0B", // amber
  sma: "#10B981", // emerald
  diploma: "#06B6D4", // cyan
  s1: "#3B82F6", // blue
  s2: "#8B5CF6", // violet
  s3: "#84CC16", // lime
  other: "#6B7280", // gray
};

// Education display names
const EDUCATION_LABELS: Record<string, string> = {
  sd: "SD",
  smp: "SMP",
  sma: "SMA",
  diploma: "Diploma",
  s1: "S1",
  s2: "S2",
  s3: "S3",
  other: "Lainnya",
};

// Religion colors mapping
const RELIGION_COLORS: Record<string, string> = {
  islam: "#10B981", // emerald
  kristen: "#3B82F6", // blue
  katolik: "#8B5CF6", // violet
  hindu: "#F59E0B", // amber
  buddha: "#06B6D4", // cyan
  konghucu: "#84CC16", // lime
  other: "#6B7280", // gray
};

// Religion display names
const RELIGION_LABELS: Record<string, string> = {
  islam: "Islam",
  kristen: "Kristen",
  katolik: "Katolik",
  hindu: "Hindu",
  buddha: "Buddha",
  konghucu: "Konghucu",
  other: "Lainnya",
};

// Helper function to calculate diversity score (Shannon diversity index)
function calculateDiversityScore(
  dataPoints: UserProfileChartDataPoint[],
  total: number
): number {
  if (total === 0) return 0;

  const entropy = dataPoints.reduce((sum, point) => {
    if (point.value === 0) return sum;
    const proportion = point.value / total;
    return sum - proportion * Math.log2(proportion);
  }, 0);

  // Normalize to 0-1 scale
  const maxEntropy = Math.log2(dataPoints.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// Helper function to create chart section
function createChartSection(
  type: "gender" | "education" | "religion",
  title: string,
  distribution: Array<{ category: string; count: number }>,
  colorMapping: Record<string, string>,
  labelMapping: Record<string, string>
): UserProfileChartSection {
  const totalUsers = distribution.reduce((sum, item) => sum + item.count, 0);

  const dataPoints: UserProfileChartDataPoint[] = distribution.map((item) => {
    const percentage = totalUsers > 0 ? (item.count / totalUsers) * 100 : 0;

    return {
      category: item.category,
      value: item.count,
      label:
        labelMapping[item.category] ||
        item.category.charAt(0).toUpperCase() + item.category.slice(1),
      percentage: Math.round(percentage * 100) / 100,
      color: colorMapping[item.category] || colorMapping.other || "#6B7280",
    };
  });

  // Calculate summary
  const mostCommon = dataPoints[0] || { category: "", value: 0, label: "" };
  const leastCommon = dataPoints[dataPoints.length - 1] || {
    category: "",
    value: 0,
    label: "",
  };
  const diversityScore = calculateDiversityScore(dataPoints, totalUsers);

  return {
    type,
    title,
    total_users: totalUsers,
    data_points: dataPoints,
    summary: {
      most_common: mostCommon.label,
      most_common_count: mostCommon.value,
      least_common: leastCommon.label,
      least_common_count: leastCommon.value,
      diversity_score: Math.round(diversityScore * 100) / 100,
    },
  };
}

export async function getUserProfileChartHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get gender distribution
    const genderDistribution = await db
      .select({
        category: users.gender,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(sql`${users.role} = 'participant' AND ${users.gender} IS NOT NULL`)
      .groupBy(users.gender)
      .orderBy(sql`COUNT(*) DESC`);

    // Get education distribution
    const educationDistribution = await db
      .select({
        category: users.education,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(
        sql`${users.role} = 'participant' AND ${users.education} IS NOT NULL`
      )
      .groupBy(users.education)
      .orderBy(sql`COUNT(*) DESC`);

    // Get religion distribution
    const religionDistribution = await db
      .select({
        category: users.religion,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(
        sql`${users.role} = 'participant' AND ${users.religion} IS NOT NULL`
      )
      .groupBy(users.religion)
      .orderBy(sql`COUNT(*) DESC`);

    // Get total participants count
    const totalParticipantsResult = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(sql`${users.role} = 'participant'`);

    const totalParticipants = totalParticipantsResult[0]?.count || 0;

    // Create chart sections
    const sections: UserProfileChartSection[] = [
      createChartSection(
        "gender",
        "Distribusi Gender",
        genderDistribution.map((item) => ({
          category: item.category ?? "other",
          count: item.count,
        })),
        GENDER_COLORS,
        GENDER_LABELS
      ),
      createChartSection(
        "education",
        "Distribusi Pendidikan",
        educationDistribution.map((item) => ({
          category: item.category ?? "other",
          count: item.count,
        })),
        EDUCATION_COLORS,
        EDUCATION_LABELS
      ),
      createChartSection(
        "religion",
        "Distribusi Agama",
        religionDistribution.map((item) => ({
          category: item.category ?? "other",
          count: item.count,
        })),
        RELIGION_COLORS,
        RELIGION_LABELS
      ),
    ];

    // Calculate overall diversity scores
    const diversityScores = {
      gender:
        sections.find((s) => s.type === "gender")?.summary.diversity_score || 0,
      education:
        sections.find((s) => s.type === "education")?.summary.diversity_score ||
        0,
      religion:
        sections.find((s) => s.type === "religion")?.summary.diversity_score ||
        0,
      overall: 0,
    };

    // Calculate overall diversity score (average of all three)
    diversityScores.overall =
      (diversityScores.gender +
        diversityScores.education +
        diversityScores.religion) /
      3;
    diversityScores.overall = Math.round(diversityScores.overall * 100) / 100;

    // Determine demographics health
    let demographicsHealth: "Excellent" | "Good" | "Fair" | "Poor";
    if (diversityScores.overall >= 0.8) {
      demographicsHealth = "Excellent";
    } else if (diversityScores.overall >= 0.6) {
      demographicsHealth = "Good";
    } else if (diversityScores.overall >= 0.4) {
      demographicsHealth = "Fair";
    } else {
      demographicsHealth = "Poor";
    }

    const response: UserProfileChartResponse = {
      success: true,
      message: "User profile chart data retrieved successfully",
      data: {
        total_users: totalParticipants,
        sections,
        overall_summary: {
          total_participants: totalParticipants,
          diversity_scores: diversityScores,
          demographics_health: demographicsHealth,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting user profile chart data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve user profile chart data",
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
