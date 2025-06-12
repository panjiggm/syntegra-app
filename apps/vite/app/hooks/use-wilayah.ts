import { useQuery } from "@tanstack/react-query";
import { apiClient } from "~/lib/api-client";

// Types for Wilayah Indonesia API
interface Province {
  code: string;
  name: string;
}

interface Regency {
  code: string;
  name: string;
  province_code: string;
}

interface District {
  code: string;
  name: string;
  regency_code: string;
}

interface Village {
  code: string;
  name: string;
  district_code: string;
  postal_code: string;
}

// API Response types
interface WilayahApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  timestamp: string;
}

export function useWilayah() {
  // Get all provinces
  const useProvinces = () => {
    return useQuery({
      queryKey: ["wilayah", "provinces"],
      queryFn: async (): Promise<Province[]> => {
        const response =
          await apiClient.get<WilayahApiResponse<Province>>(
            "/wilayah/provinces"
          );

        if (!response.success) {
          throw new Error(response.message || "Gagal mengambil data provinsi");
        }

        return response.data;
      },
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
  };

  // Get regencies by province code
  const useRegencies = (provinceCode: string) => {
    return useQuery({
      queryKey: ["wilayah", "regencies", provinceCode],
      queryFn: async (): Promise<Regency[]> => {
        if (!provinceCode) return [];

        const response = await apiClient.get<WilayahApiResponse<Regency>>(
          `/wilayah/regencies/${provinceCode}`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Gagal mengambil data kabupaten/kota"
          );
        }

        return response.data;
      },
      enabled: !!provinceCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
  };

  // Get districts by regency code
  const useDistricts = (regencyCode: string) => {
    return useQuery({
      queryKey: ["wilayah", "districts", regencyCode],
      queryFn: async (): Promise<District[]> => {
        if (!regencyCode) return [];

        const response = await apiClient.get<WilayahApiResponse<District>>(
          `/wilayah/districts/${regencyCode}`
        );

        if (!response.success) {
          throw new Error(response.message || "Gagal mengambil data kecamatan");
        }

        return response.data;
      },
      enabled: !!regencyCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
  };

  // Get villages by district code
  const useVillages = (districtCode: string) => {
    return useQuery({
      queryKey: ["wilayah", "villages", districtCode],
      queryFn: async (): Promise<Village[]> => {
        if (!districtCode) return [];

        const response = await apiClient.get<WilayahApiResponse<Village>>(
          `/wilayah/villages/${districtCode}`
        );

        if (!response.success) {
          throw new Error(
            response.message || "Gagal mengambil data kelurahan/desa"
          );
        }

        return response.data;
      },
      enabled: !!districtCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
  };

  return {
    useProvinces,
    useRegencies,
    useDistricts,
    useVillages,
  };
}

// Hook for finding location names by codes
export function useLocationNames() {
  const { useProvinces, useRegencies, useDistricts, useVillages } =
    useWilayah();

  const findProvinceName = (provinceCode: string) => {
    const provincesQuery = useProvinces();
    const provinces = provincesQuery.data || [];
    return provinces.find((p) => p.code === provinceCode)?.name || "";
  };

  const findRegencyName = (provinceCode: string, regencyCode: string) => {
    const regenciesQuery = useRegencies(provinceCode);
    const regencies = regenciesQuery.data || [];
    return regencies.find((r) => r.code === regencyCode)?.name || "";
  };

  const findDistrictName = (regencyCode: string, districtCode: string) => {
    const districtsQuery = useDistricts(regencyCode);
    const districts = districtsQuery.data || [];
    return districts.find((d) => d.code === districtCode)?.name || "";
  };

  const findVillageName = (districtCode: string, villageCode: string) => {
    const villagesQuery = useVillages(districtCode);
    const villages = villagesQuery.data || [];
    return villages.find((v) => v.code === villageCode)?.name || "";
  };

  return {
    findProvinceName,
    findRegencyName,
    findDistrictName,
    findVillageName,
  };
}
