import { Context } from "hono";
import { type CloudflareBindings } from "../../lib/env";
import { CreateUserRequestSchema } from "shared-types";

export function getUserSchemaHandler(
  c: Context<{ Bindings: CloudflareBindings }>
) {
  return c.json({
    success: true,
    message: "User creation schema",
    data: {
      schema: CreateUserRequestSchema._def,
      example: {
        nik: "1234567890123456",
        name: "John Doe",
        role: "participant",
        email: "john.doe@example.com",
        gender: "male",
        phone: "+62812345678",
        birth_place: "Jakarta",
        birth_date: "1990-01-01T00:00:00.000Z",
        religion: "islam",
        education: "s1",
        address: "Jl. Sudirman No. 123",
        province: "DKI Jakarta",
        regency: "Jakarta Pusat",
        district: "Menteng",
        village: "Menteng",
        postal_code: "10310",
        profile_picture_url: "https://example.com/profile.jpg",
      },
      enums: {
        role: ["admin", "participant"],
        gender: ["male", "female"],
        religion: [
          "islam",
          "kristen",
          "katolik",
          "hindu",
          "buddha",
          "konghucu",
          "other",
        ],
        education: ["sd", "smp", "sma", "diploma", "s1", "s2", "s3", "other"],
      },
    },
    timestamp: new Date().toISOString(),
  });
}
