import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/contexts/auth-context";
import { apiClient } from "~/lib/api-client";
import { queryKeys } from "~/lib/query-client";

// Province Chart Data Point Interface
export interface ProvinceChartDataPoint {
  province: string;
  value: number;
  label: string;
  percentage: number;
  color: string;
}

// Province Chart Summary Interface
export interface ProvinceChartSummary {
  most_popular_province: string;
  most_popular_count: number;
  least_popular_province: string;
  least_popular_count: number;
  diversity_score: number;
  top_3_provinces: Array<{
    province: string;
    count: number;
    percentage: number;
  }>;
}

// Main Response Interface
export interface ProvinceChartResponse {
  total_users: number;
  provinces_count: number;
  data_points: ProvinceChartDataPoint[];
  summary: ProvinceChartSummary;
}

// API Response Interface
export interface GetProvinceChartApiResponse {
  success: boolean;
  message: string;
  data: ProvinceChartResponse;
  timestamp: string;
}

// Error Response Interface
export interface ProvinceChartErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}

// Hook Options Interface
export interface UseProvinceChartOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: (attemptIndex: number) => number;
}

// Main Hook
export function useProvinceChart(options: UseProvinceChartOptions = {}) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000, // 15 minutes (longer for province data - less frequent updates)
    refetchInterval = 20 * 60 * 1000, // 20 minutes (slow update for geographic distribution)
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  const endpoint = "/dashboard/admin/province-chart";

  return useQuery({
    queryKey: [...queryKeys.dashboard.all(), "province-chart"],
    queryFn: async (): Promise<ProvinceChartResponse> => {
      const response = await apiClient.get<GetProvinceChartApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch province chart data"
        );
      }

      return response.data;
    },
    enabled: enabled && !!user && user.role === "admin",
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    // Transform data for easier consumption
    select: (data: ProvinceChartResponse) => ({
      ...data,
      // Add formatted data points for bar chart consumption (recommended for provinces)
      chartData: data.data_points.map((point) => ({
        name: point.label, // For Recharts bar chart
        value: point.value,
        province: point.province,
        percentage: point.percentage,
        color: point.color,
        fill: point.color, // For Recharts bar chart fill
        label: point.label,
        // Additional formatting for bar charts
        formattedValue: point.value.toLocaleString(),
        formattedPercentage: `${point.percentage}%`,
        displayLabel: `${point.label} (${point.percentage}%)`,
        tooltipLabel: `${point.label}: ${point.value} peserta (${point.percentage}%)`,
        // Bar chart specific properties
        barSize: 20,
        radius: [2, 2, 0, 0], // Rounded top corners for bars
      })),
      // Add summary with formatted values
      formattedSummary: {
        ...data.summary,
        diversity_score: Math.round(data.summary.diversity_score * 100) / 100,
        diversity_percentage: `${Math.round(data.summary.diversity_score * 100)}%`,
        diversity_level: 
          data.summary.diversity_score >= 0.8 ? "Tinggi" :
          data.summary.diversity_score >= 0.6 ? "Sedang" :
          data.summary.diversity_score >= 0.4 ? "Rendah" : "Sangat Rendah",
        diversity_color:
          data.summary.diversity_score >= 0.8 ? "text-green-600" :
          data.summary.diversity_score >= 0.6 ? "text-blue-600" :
          data.summary.diversity_score >= 0.4 ? "text-yellow-600" : "text-red-600",
        diversity_bg:
          data.summary.diversity_score >= 0.8 ? "bg-green-50" :
          data.summary.diversity_score >= 0.6 ? "bg-blue-50" :
          data.summary.diversity_score >= 0.4 ? "bg-yellow-50" : "bg-red-50",
        // Format top 3 provinces
        formatted_top_3: data.summary.top_3_provinces.map((prov, index) => ({
          ...prov,
          rank: index + 1,
          formattedCount: prov.count.toLocaleString(),
          formattedPercentage: `${prov.percentage}%`,
          medalColor: 
            index === 0 ? "text-yellow-600" : // Gold
            index === 1 ? "text-gray-500" : // Silver
            "text-orange-600", // Bronze
        })),
      },
      // Chart-specific configuration for horizontal bar chart (recommended for provinces)
      barChartConfig: {
        layout: "horizontal", // Horizontal bars for better province label readability
        dataKey: "value",
        nameKey: "name",
        margin: { top: 20, right: 30, left: 100, bottom: 5 }, // More left margin for province names
        barCategoryGap: "10%",
        label: {
          position: "right",
          fontSize: 12,
          fill: "#374151",
        },
        xAxis: {
          type: "number",
          axisLine: false,
          tickLine: false,
          tick: { fontSize: 12, fill: "#6B7280" },
        },
        yAxis: {
          type: "category",
          axisLine: false,
          tickLine: false,
          tick: { fontSize: 11, fill: "#374151" },
          width: 90,
        },
      },
      // Colors palette for consistent theming
      colorPalette: data.data_points.map(point => point.color),
      // Geographic regions grouping for better visualization
      regionGroups: {
        jawa: data.data_points.filter(p => 
          p.province.includes("Jawa") || 
          p.province.includes("DKI Jakarta") || 
          p.province.includes("Banten")
        ),
        sumatera: data.data_points.filter(p => 
          p.province.includes("Sumatera") || 
          p.province.includes("Aceh") || 
          p.province.includes("Riau") || 
          p.province.includes("Bengkulu") || 
          p.province.includes("Jambi") || 
          p.province.includes("Lampung") || 
          p.province.includes("Bangka Belitung") || 
          p.province.includes("Kepulauan Riau")
        ),
        kalimantan: data.data_points.filter(p => 
          p.province.includes("Kalimantan")
        ),
        sulawesi: data.data_points.filter(p => 
          p.province.includes("Sulawesi") || 
          p.province.includes("Gorontalo")
        ),
        eastern: data.data_points.filter(p => 
          p.province.includes("Papua") || 
          p.province.includes("Maluku") || 
          p.province.includes("Nusa Tenggara") || 
          p.province.includes("Bali")
        ),
      },
    }),
    // Meta information for debugging
    meta: {
      errorMessage: "Failed to load province chart data",
      endpoint,
    },
  });
}

// Hook for multiple province charts comparison (if needed in the future)
export function useMultipleProvinceCharts(
  configs: Array<{
    key: string;
    options?: UseProvinceChartOptions;
  }>
) {
  const { user } = useAuth();

  const queries = configs.map((config) => ({
    queryKey: [...queryKeys.dashboard.all(), "province-chart", config.key],
    queryFn: async (): Promise<ProvinceChartResponse> => {
      const response = await apiClient.get<GetProvinceChartApiResponse>(
        "/dashboard/admin/province-chart"
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch province chart data"
        );
      }

      return response.data;
    },
    enabled: !!user && user.role === "admin",
    staleTime: config.options?.staleTime || 15 * 60 * 1000,
    refetchInterval: config.options?.refetchInterval || 20 * 60 * 1000,
    retry: config.options?.retry || 2,
    retryDelay:
      config.options?.retryDelay ||
      ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)),
  }));

  return queries;
}

// Utility hook for province chart options
export function useProvinceChartOptions() {
  const chartTypes = [
    {
      value: "horizontal-bar",
      label: "Horizontal Bar Chart",
      description: "Horizontal bars for better province label readability",
      recommended: true,
    },
    {
      value: "vertical-bar",
      label: "Vertical Bar Chart",
      description: "Vertical bars for compact visualization",
    },
    {
      value: "treemap",
      label: "Treemap",
      description: "Hierarchical rectangular visualization",
    },
    {
      value: "map",
      label: "Indonesia Map",
      description: "Geographic visualization on Indonesia map",
    },
  ];

  const displayOptions = [
    { value: "percentage", label: "Show Percentage", description: "Display percentage values" },
    { value: "count", label: "Show Count", description: "Display raw count values" },
    { value: "both", label: "Show Both", description: "Display both percentage and count" },
  ];

  const sortOptions = [
    { value: "desc", label: "Highest to Lowest", description: "Sort by count descending" },
    { value: "asc", label: "Lowest to Highest", description: "Sort by count ascending" },
    { value: "alphabetical", label: "Alphabetical", description: "Sort by province name" },
    { value: "regional", label: "By Region", description: "Group by geographic region" },
  ];

  const regionFilters = [
    { value: "all", label: "All Provinces", description: "Show all provinces" },
    { value: "jawa", label: "Jawa & Jakarta", description: "Java island provinces" },
    { value: "sumatera", label: "Sumatera", description: "Sumatra island provinces" },
    { value: "kalimantan", label: "Kalimantan", description: "Borneo island provinces" },
    { value: "sulawesi", label: "Sulawesi", description: "Celebes island provinces" },
    { value: "eastern", label: "Eastern Indonesia", description: "Eastern provinces" },
  ];

  const colorSchemes = [
    {
      name: "Geographic",
      description: "Colors based on geographic regions",
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"],
    },
    {
      name: "Population",
      description: "Colors based on population density",
      colors: ["#FEF3C7", "#FCD34D", "#F59E0B", "#D97706", "#92400E"],
    },
    {
      name: "Default",
      description: "Standard color palette",
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16", "#EC4899"],
    },
  ];

  return {
    chartTypes,
    displayOptions,
    sortOptions,
    regionFilters,
    colorSchemes,
  };
}

// Helper function to format province chart data for charts
export function formatProvinceChartDataForChart(data: ProvinceChartResponse) {
  return {
    data: data.data_points.map((point) => ({
      name: point.label,
      value: point.value,
      province: point.province,
      percentage: point.percentage,
      color: point.color,
      fill: point.color,
      formattedValue: `${point.value.toLocaleString()} peserta`,
      formattedPercentage: `${point.percentage}%`,
      tooltip: `${point.label}: ${point.value.toLocaleString()} peserta (${point.percentage}%)`,
    })),
    summary: {
      total: data.total_users,
      provinces: data.provinces_count,
      mostPopular: {
        province: data.summary.most_popular_province,
        count: data.summary.most_popular_count,
      },
      leastPopular: {
        province: data.summary.least_popular_province,
        count: data.summary.least_popular_count,
      },
      diversity: {
        score: data.summary.diversity_score,
        percentage: `${Math.round(data.summary.diversity_score * 100)}%`,
        level: 
          data.summary.diversity_score >= 0.8 ? "Tinggi" :
          data.summary.diversity_score >= 0.6 ? "Sedang" :
          data.summary.diversity_score >= 0.4 ? "Rendah" : "Sangat Rendah",
      },
      top3: data.summary.top_3_provinces,
    },
  };
}

// Hook for real-time province chart updates
export function useRealtimeProvinceChart(options: UseProvinceChartOptions = {}) {
  return useProvinceChart({
    ...options,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for real-time updates
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });
}

// Hook for province chart with filtering (future enhancement)
export function useProvinceChartWithFilter(
  filters: {
    region?: string;
    minCount?: number;
    maxCount?: number;
    dateRange?: { start: string; end: string };
  },
  options: UseProvinceChartOptions = {}
) {
  const { user } = useAuth();

  const {
    enabled = true,
    staleTime = 15 * 60 * 1000,
    refetchInterval = 20 * 60 * 1000,
    retry = 2,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  } = options;

  // Build endpoint with filters (if API supports it in the future)
  const params = new URLSearchParams();
  if (filters.region) params.append("region", filters.region);
  if (filters.minCount) params.append("min_count", filters.minCount.toString());
  if (filters.maxCount) params.append("max_count", filters.maxCount.toString());
  if (filters.dateRange) {
    params.append("start_date", filters.dateRange.start);
    params.append("end_date", filters.dateRange.end);
  }

  const endpoint = `/dashboard/admin/province-chart?${params.toString()}`;

  return useQuery({
    queryKey: [
      ...queryKeys.dashboard.all(),
      "province-chart-filtered",
      filters,
    ],
    queryFn: async (): Promise<ProvinceChartResponse> => {
      const response = await apiClient.get<GetProvinceChartApiResponse>(endpoint);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to fetch filtered province chart data"
        );
      }

      return response.data;
    },
    enabled: enabled && !!user && user.role === "admin",
    staleTime,
    refetchInterval,
    retry,
    retryDelay,
    meta: {
      errorMessage: "Failed to load filtered province chart data",
      endpoint,
    },
  });
}

// Utility function to get province colors mapping
export function getProvinceColorMapping(): Record<string, string> {
  return {
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
}

// Utility function to get regional groupings
export function getRegionalGroupings(): Record<string, string[]> {
  return {
    jawa: [
      "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten", "DI Yogyakarta"
    ],
    sumatera: [
      "Sumatera Utara", "Sumatera Barat", "Sumatera Selatan", "Aceh", "Riau", 
      "Bengkulu", "Jambi", "Lampung", "Bangka Belitung", "Kepulauan Riau"
    ],
    kalimantan: [
      "Kalimantan Timur", "Kalimantan Selatan", "Kalimantan Barat", 
      "Kalimantan Tengah", "Kalimantan Utara"
    ],
    sulawesi: [
      "Sulawesi Selatan", "Sulawesi Utara", "Sulawesi Tengah", 
      "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat"
    ],
    eastern: [
      "Papua", "Papua Barat", "Papua Tengah", "Papua Selatan", 
      "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Bali"
    ],
  };
}

// Utility function to get top provinces with formatting
export function getTopProvinces(data: ProvinceChartResponse, limit: number = 5) {
  return data.data_points.slice(0, limit).map((point, index) => ({
    rank: index + 1,
    province: point.label,
    count: point.value,
    percentage: point.percentage,
    color: point.color,
    formattedCount: point.value.toLocaleString(),
    formattedPercentage: `${point.percentage}%`,
    medalIcon: 
      index === 0 ? ">G" : 
      index === 1 ? ">H" : 
      index === 2 ? ">I" : 
      `${index + 1}`,
  }));
}

// Utility function to calculate regional statistics
export function calculateRegionalStats(data: ProvinceChartResponse) {
  const regionalGroupings = getRegionalGroupings();
  const regionalStats: Record<string, { 
    count: number; 
    percentage: number; 
    provinces: string[] 
  }> = {};

  Object.entries(regionalGroupings).forEach(([region, provinces]) => {
    const regionData = data.data_points.filter(point => 
      provinces.includes(point.province)
    );
    
    const totalCount = regionData.reduce((sum, point) => sum + point.value, 0);
    const percentage = data.total_users > 0 ? (totalCount / data.total_users) * 100 : 0;
    
    regionalStats[region] = {
      count: totalCount,
      percentage: Math.round(percentage * 100) / 100,
      provinces: regionData.map(point => point.label),
    };
  });

  return regionalStats;
}