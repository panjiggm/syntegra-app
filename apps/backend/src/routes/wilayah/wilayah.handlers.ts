import { Context } from "hono";
import { type CloudflareBindings } from "../../lib/env";

const WILAYAH_BASE_URL = "https://wilayah.id/api";

// Types for wilayah.id API responses
interface WilayahResponse<T> {
  data: T[];
}

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

// Error response type
interface ErrorResponse {
  success: false;
  message: string;
  timestamp: string;
}

// Success response type
interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T[];
  timestamp: string;
}

// Helper function to fetch from wilayah.id
async function fetchWilayahData<T>(
  endpoint: string,
  c: Context<{ Bindings: CloudflareBindings }>
): Promise<T[]> {
  try {
    console.log(`🌐 Fetching from wilayah.id: ${endpoint}`);

    const response = await fetch(`${WILAYAH_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Syntegra-Psikotes/1.0",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: WilayahResponse<T> = await response.json();

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error("Invalid response format from wilayah.id API");
    }

    console.log(
      `✅ Successfully fetched ${result.data.length} items from wilayah.id`
    );
    return result.data;
  } catch (error) {
    console.error(`❌ Error fetching from wilayah.id:`, error);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout - wilayah.id API tidak merespons");
      }
      throw new Error(`Gagal mengakses data wilayah: ${error.message}`);
    }

    throw new Error("Gagal mengakses data wilayah");
  }
}

// Get all provinces
export async function getProvincesHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const provinces = await fetchWilayahData<Province>("/provinces.json", c);

    const response: SuccessResponse<Province> = {
      success: true,
      message: `Berhasil mengambil ${provinces.length} provinsi`,
      data: provinces,
      timestamp: new Date().toISOString(),
    };

    // Cache for 24 hours
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(response, 200);
  } catch (error) {
    console.error("Error in getProvincesHandler:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data provinsi",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// Get regencies by province code
export async function getRegenciesHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const { provinceCode } = c.req.param();

    if (!provinceCode) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Kode provinsi harus disediakan",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate province code format (should be 2 digits)
    if (!/^\d{2}$/.test(provinceCode)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Format kode provinsi tidak valid (harus 2 digit)",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const regencies = await fetchWilayahData<Regency>(
      `/regencies/${provinceCode}.json`,
      c
    );

    const response: SuccessResponse<Regency> = {
      success: true,
      message: `Berhasil mengambil ${regencies.length} kabupaten/kota untuk provinsi ${provinceCode}`,
      data: regencies,
      timestamp: new Date().toISOString(),
    };

    // Cache for 24 hours
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(response, 200);
  } catch (error) {
    console.error("Error in getRegenciesHandler:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data kabupaten/kota",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// Get districts by regency code
export async function getDistrictsHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const { regencyCode } = c.req.param();

    if (!regencyCode) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Kode kabupaten/kota harus disediakan",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate regency code format (should be 4-5 characters, can include dots)
    if (!/^[\d.]{2,5}$/.test(regencyCode)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Format kode kabupaten/kota tidak valid",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const districts = await fetchWilayahData<District>(
      `/districts/${regencyCode}.json`,
      c
    );

    const response: SuccessResponse<District> = {
      success: true,
      message: `Berhasil mengambil ${districts.length} kecamatan untuk kabupaten/kota ${regencyCode}`,
      data: districts,
      timestamp: new Date().toISOString(),
    };

    // Cache for 24 hours
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(response, 200);
  } catch (error) {
    console.error("Error in getDistrictsHandler:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data kecamatan",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}

// Get villages by district code
export async function getVillagesHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  try {
    const { districtCode } = c.req.param();

    if (!districtCode) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Kode kecamatan harus disediakan",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    // Validate district code format (should be 6-10 characters, can include dots)
    if (!/^[\d.]{4,10}$/.test(districtCode)) {
      const errorResponse: ErrorResponse = {
        success: false,
        message: "Format kode kecamatan tidak valid",
        timestamp: new Date().toISOString(),
      };
      return c.json(errorResponse, 400);
    }

    const villages = await fetchWilayahData<Village>(
      `/villages/${districtCode}.json`,
      c
    );

    const response: SuccessResponse<Village> = {
      success: true,
      message: `Berhasil mengambil ${villages.length} kelurahan/desa untuk kecamatan ${districtCode}`,
      data: villages,
      timestamp: new Date().toISOString(),
    };

    // Cache for 24 hours
    c.header("Cache-Control", "public, max-age=86400");
    return c.json(response, 200);
  } catch (error) {
    console.error("Error in getVillagesHandler:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data kelurahan/desa",
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
