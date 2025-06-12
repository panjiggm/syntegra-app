import { Hono } from "hono";
import { generalApiRateLimit } from "@/middleware/rateLimiter";
import { type CloudflareBindings } from "@/lib/env";
import {
  getProvincesHandler,
  getRegenciesHandler,
  getDistrictsHandler,
  getVillagesHandler,
} from "./wilayah.handlers";

const wilayahRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ==================== WILAYAH ROUTES (PUBLIC) ====================
// These endpoints proxy requests to wilayah.id API to avoid CORS issues

// Get all provinces
wilayahRoutes.get("/provinces", generalApiRateLimit, getProvincesHandler);

// Get regencies by province code
wilayahRoutes.get(
  "/regencies/:provinceCode",
  generalApiRateLimit,
  getRegenciesHandler
);

// Get districts by regency code
wilayahRoutes.get(
  "/districts/:regencyCode",
  generalApiRateLimit,
  getDistrictsHandler
);

// Get villages by district code
wilayahRoutes.get(
  "/villages/:districtCode",
  generalApiRateLimit,
  getVillagesHandler
);

export { wilayahRoutes };
