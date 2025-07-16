import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Age Bar Chart Data Point Interface
interface AgeBarDataPoint {
  age_group: string;
  count: number;
  percentage: number;
  color: string;
  min_age: number;
  max_age: number;
}

// Age Bar Chart Response Interface
interface AgeBarResponse {
  success: true;
  message: string;
  data: {
    total_participants: number;
    participants_with_birth_date: number;
    data_points: AgeBarDataPoint[];
    statistics: {
      average_age: number;
      median_age: number;
      most_common_age_group: string;
      most_common_count: number;
      age_diversity_score: number;
    };
  };
  timestamp: string;
}

// Age group colors (gradient from young to old)
const AGE_COLORS: Record<string, string> = {
  "18-22": "#3B82F6", // blue (young)
  "23-27": "#06B6D4", // cyan
  "28-32": "#10B981", // emerald
  "33-37": "#84CC16", // lime
  "38-42": "#F59E0B", // amber
  "43-47": "#EF4444", // red
  "48-52": "#8B5CF6", // violet
  "53-57": "#EC4899", // pink
  "58+": "#6B7280", // gray (senior)
};

// Helper function to get age group from age
function getAgeGroup(age: number): string {
  if (age >= 18 && age <= 22) return "18-22";
  if (age >= 23 && age <= 27) return "23-27";
  if (age >= 28 && age <= 32) return "28-32";
  if (age >= 33 && age <= 37) return "33-37";
  if (age >= 38 && age <= 42) return "38-42";
  if (age >= 43 && age <= 47) return "43-47";
  if (age >= 48 && age <= 52) return "48-52";
  if (age >= 53 && age <= 57) return "53-57";
  if (age >= 58) return "58+";
  return "unknown"; // for ages < 18 or invalid
}

// Helper function to get min/max age from group
function getAgeRangeFromGroup(ageGroup: string): { min: number; max: number } {
  switch (ageGroup) {
    case "18-22": return { min: 18, max: 22 };
    case "23-27": return { min: 23, max: 27 };
    case "28-32": return { min: 28, max: 32 };
    case "33-37": return { min: 33, max: 37 };
    case "38-42": return { min: 38, max: 42 };
    case "43-47": return { min: 43, max: 47 };
    case "48-52": return { min: 48, max: 52 };
    case "53-57": return { min: 53, max: 57 };
    case "58+": return { min: 58, max: 100 };
    default: return { min: 0, max: 0 };
  }
}

// Helper function to calculate median
function calculateMedian(sortedAges: number[]): number {
  const n = sortedAges.length;
  if (n === 0) return 0;
  if (n % 2 === 0) {
    return (sortedAges[n / 2 - 1] + sortedAges[n / 2]) / 2;
  }
  return sortedAges[Math.floor(n / 2)];
}

// Helper function to calculate diversity score
function calculateAgeDiversityScore(dataPoints: AgeBarDataPoint[], total: number): number {
  if (total === 0) return 0;
  
  const entropy = dataPoints.reduce((sum, point) => {
    if (point.count === 0) return sum;
    const proportion = point.count / total;
    return sum - (proportion * Math.log2(proportion));
  }, 0);
  
  // Normalize to 0-1 scale
  const maxEntropy = Math.log2(dataPoints.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

export async function getAgeBarHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get users with birth_date (participants only) - optimized query
    const usersWithBirthDate = await db
      .select({
        birth_date: users.birth_date,
      })
      .from(users)
      .where(
        sql`${users.role} = 'participant' AND ${users.birth_date} IS NOT NULL`
      );

    // Get total participants count
    const totalParticipantsResult = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(sql`${users.role} = 'participant'`);

    const totalParticipants = totalParticipantsResult[0]?.count || 0;
    const participantsWithBirthDate = usersWithBirthDate.length;

    // Calculate ages and group them
    const currentYear = new Date().getFullYear();
    const ageGroupCounts: Record<string, number> = {
      "18-22": 0,
      "23-27": 0,
      "28-32": 0,
      "33-37": 0,
      "38-42": 0,
      "43-47": 0,
      "48-52": 0,
      "53-57": 0,
      "58+": 0,
    };

    const ages: number[] = [];

    // Process each user's birth date
    usersWithBirthDate.forEach((user) => {
      if (user.birth_date) {
        const birthYear = new Date(user.birth_date).getFullYear();
        const age = currentYear - birthYear;
        
        // Only include valid ages (18+)
        if (age >= 18 && age <= 100) {
          ages.push(age);
          const ageGroup = getAgeGroup(age);
          if (ageGroupCounts[ageGroup] !== undefined) {
            ageGroupCounts[ageGroup]++;
          }
        }
      }
    });

    // Create data points for chart
    const dataPoints: AgeBarDataPoint[] = Object.entries(ageGroupCounts).map(([ageGroup, count]) => {
      const percentage = participantsWithBirthDate > 0 ? (count / participantsWithBirthDate) * 100 : 0;
      const { min, max } = getAgeRangeFromGroup(ageGroup);
      
      return {
        age_group: ageGroup,
        count,
        percentage: Math.round(percentage * 100) / 100,
        color: AGE_COLORS[ageGroup] || "#6B7280",
        min_age: min,
        max_age: max,
      };
    });

    // Calculate statistics
    const sortedAges = ages.sort((a, b) => a - b);
    const averageAge = ages.length > 0 ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 100) / 100 : 0;
    const medianAge = calculateMedian(sortedAges);
    
    // Find most common age group
    const mostCommonEntry = dataPoints.reduce((max, current) => 
      current.count > max.count ? current : max, dataPoints[0] || { age_group: "", count: 0 }
    );

    // Calculate age diversity
    const ageDiversityScore = calculateAgeDiversityScore(dataPoints, participantsWithBirthDate);

    const response: AgeBarResponse = {
      success: true,
      message: "Age distribution bar chart data retrieved successfully",
      data: {
        total_participants: totalParticipants,
        participants_with_birth_date: participantsWithBirthDate,
        data_points: dataPoints,
        statistics: {
          average_age: averageAge,
          median_age: medianAge,
          most_common_age_group: mostCommonEntry.age_group,
          most_common_count: mostCommonEntry.count,
          age_diversity_score: Math.round(ageDiversityScore * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting age bar chart data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve age distribution data",
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