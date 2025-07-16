import { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDbFromEnv, users } from "@/db";
import { type CloudflareBindings } from "@/lib/env";

// Province Chart Data Point Interface
interface ProvinceChartDataPoint {
  province: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Province Chart Response Interface
interface ProvinceChartResponse {
  success: true;
  message: string;
  data: {
    total_users: number;
    provinces_count: number;
    data_points: ProvinceChartDataPoint[];
    summary: {
      most_popular_province: string;
      most_popular_count: number;
      least_popular_province: string;
      least_popular_count: number;
      diversity_score: number; // 0-1, higher = more diverse
      top_3_provinces: Array<{
        province: string;
        count: number;
        percentage: number;
      }>;
    };
  };
  timestamp: string;
}

// Province colors mapping (using consistent color palette)
const PROVINCE_COLORS: Record<string, string> = {
  "DKI Jakarta": "#3B82F6", // blue
  "Jawa Barat": "#10B981", // emerald
  "Jawa Tengah": "#F59E0B", // amber
  "Jawa Timur": "#8B5CF6", // violet
  "Sumatera Utara": "#EF4444", // red
  "Sumatera Barat": "#06B6D4", // cyan
  "Sumatera Selatan": "#84CC16", // lime
  "Kalimantan Timur": "#EC4899", // pink
  "Kalimantan Selatan": "#F97316", // orange
  "Sulawesi Selatan": "#8B5A2B", // brown
  "Sulawesi Utara": "#6366F1", // indigo
  "Bali": "#14B8A6", // teal
  "Nusa Tenggara Barat": "#A855F7", // purple
  "Nusa Tenggara Timur": "#DC2626", // red-600
  "Maluku": "#059669", // emerald-600
  "Papua": "#7C3AED", // violet-600
  "Aceh": "#0891B2", // cyan-600
  "Riau": "#CA8A04", // yellow-600
  "Bengkulu": "#BE123C", // rose-600
  "Jambi": "#166534", // green-700
  "Lampung": "#7C2D12", // orange-700
  "Bangka Belitung": "#581C87", // purple-700
  "Kepulauan Riau": "#0F766E", // teal-700
  "Kalimantan Barat": "#A16207", // amber-700
  "Kalimantan Tengah": "#B91C1C", // red-700
  "Kalimantan Utara": "#1F2937", // gray-800
  "Sulawesi Tengah": "#374151", // gray-700
  "Sulawesi Tenggara": "#4B5563", // gray-600
  "Gorontalo": "#6B7280", // gray-500
  "Sulawesi Barat": "#9CA3AF", // gray-400
  "Maluku Utara": "#D1D5DB", // gray-300
  "Papua Barat": "#E5E7EB", // gray-200
  "Papua Tengah": "#F3F4F6", // gray-100
  "Papua Selatan": "#F9FAFB", // gray-50
  "Other": "#6B7280", // gray-500
};

// Generate color for unlisted provinces
function getProvinceColor(province: string): string {
  if (PROVINCE_COLORS[province]) {
    return PROVINCE_COLORS[province];
  }
  
  // Generate a consistent color based on province name
  let hash = 0;
  for (let i = 0; i < province.length; i++) {
    hash = province.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", 
    "#06B6D4", "#84CC16", "#EC4899", "#F97316", "#8B5A2B"
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

export async function getProvinceChartHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);

    // Get user distribution by province
    const provinceDistribution = await db
      .select({
        province: sql<string>`COALESCE(${users.province}, 'Unknown')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(sql`${users.role} = 'participant'`) // Only count participants
      .groupBy(sql`COALESCE(${users.province}, 'Unknown')`)
      .orderBy(sql`COUNT(*) DESC`);

    // Calculate total users
    const totalUsers = provinceDistribution.reduce((sum, item) => sum + item.count, 0);

    // Convert to chart data points
    const dataPoints: ProvinceChartDataPoint[] = provinceDistribution.map((item) => {
      const percentage = totalUsers > 0 ? (item.count / totalUsers) * 100 : 0;
      
      return {
        province: item.province,
        value: item.count,
        label: item.province === "Unknown" ? "Tidak Diketahui" : item.province,
        percentage: Math.round(percentage * 100) / 100,
        color: getProvinceColor(item.province),
      };
    });

    // Calculate summary statistics
    const mostPopular = dataPoints[0] || { province: "", value: 0, label: "" };
    const leastPopular = dataPoints[dataPoints.length - 1] || { province: "", value: 0, label: "" };
    
    // Get top 3 provinces
    const top3Provinces = dataPoints.slice(0, 3).map(point => ({
      province: point.label,
      count: point.value,
      percentage: point.percentage,
    }));
    
    // Calculate diversity score (Shannon diversity index normalized)
    let diversityScore = 0;
    if (totalUsers > 0) {
      const entropy = dataPoints.reduce((sum, point) => {
        const proportion = point.value / totalUsers;
        return sum - (proportion * Math.log2(proportion));
      }, 0);
      
      // Normalize to 0-1 scale (divide by log2 of max possible provinces)
      const maxEntropy = Math.log2(dataPoints.length);
      diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;
    }

    const response: ProvinceChartResponse = {
      success: true,
      message: "Province chart data retrieved successfully",
      data: {
        total_users: totalUsers,
        provinces_count: dataPoints.length,
        data_points: dataPoints,
        summary: {
          most_popular_province: mostPopular.label,
          most_popular_count: mostPopular.value,
          least_popular_province: leastPopular.label,
          least_popular_count: leastPopular.value,
          diversity_score: Math.round(diversityScore * 100) / 100,
          top_3_provinces: top3Provinces,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting province chart data:", error);

    return c.json(
      {
        success: false,
        message: "Failed to retrieve province chart data",
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