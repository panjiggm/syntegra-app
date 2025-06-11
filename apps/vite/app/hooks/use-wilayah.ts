import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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
}

const WILAYAH_BASE_URL = "https://wilayah.id/api";

// Create axios instance for wilayah API
const wilayahApi = axios.create({
  baseURL: WILAYAH_BASE_URL,
  timeout: 10000,
});

export function useWilayah() {
  // Get all provinces
  const useProvinces = () => {
    return useQuery({
      queryKey: ["provinces"],
      queryFn: async (): Promise<Province[]> => {
        const response = await wilayahApi.get("/provinces.json");
        return response.data.data || [];
      },
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
    });
  };

  // Get regencies by province code
  const useRegencies = (provinceCode: string) => {
    return useQuery({
      queryKey: ["regencies", provinceCode],
      queryFn: async (): Promise<Regency[]> => {
        if (!provinceCode) return [];
        const response = await wilayahApi.get(
          `/regencies/${provinceCode}.json`
        );
        return response.data.data || [];
      },
      enabled: !!provinceCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
    });
  };

  // Get districts by regency code
  const useDistricts = (regencyCode: string) => {
    return useQuery({
      queryKey: ["districts", regencyCode],
      queryFn: async (): Promise<District[]> => {
        if (!regencyCode) return [];
        const response = await wilayahApi.get(`/districts/${regencyCode}.json`);
        return response.data.data || [];
      },
      enabled: !!regencyCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
    });
  };

  // Get villages by district code
  const useVillages = (districtCode: string) => {
    return useQuery({
      queryKey: ["villages", districtCode],
      queryFn: async (): Promise<Village[]> => {
        if (!districtCode) return [];
        const response = await wilayahApi.get(`/villages/${districtCode}.json`);
        return response.data.data || [];
      },
      enabled: !!districtCode,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
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
