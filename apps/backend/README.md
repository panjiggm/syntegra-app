# Backend Application

This is the backend application for the Syntegra psychological testing system, built with Hono and deployed on Cloudflare Workers, using Neon PostgreSQL database with Drizzle ORM.

## Features

- 🚀 **Cloudflare Workers** - Serverless deployment
- 🗃️ **Neon PostgreSQL** - Serverless database
- 🔥 **Drizzle ORM** - Type-safe database operations
- 📝 **TypeScript** - Full type safety
- ⚡ **Hono** - Fast web framework
- 🎯 **Import Aliases** - Clean and organized imports
- 📊 **Bulk User Import** - Import users from CSV

## Database Schema

The application includes a comprehensive schema for psychological testing:

- **Users** - System users (admin, psychologist, HR, participants)
- **Tests** - Psychological test definitions
- **Questions** - Test questions with various types
- **Test Sessions** - Test session management
- **Test Attempts** - User test attempts
- **Results** - Test and session results
- **Audit Logs** - System activity tracking

## Setup

### 1. Environment Variables

Create a `.env` file in the backend directory:

```env
# Neon Database URL
# Get this from your Neon console: https://console.neon.tech/
DATABASE_URL="postgresql://username:password@host.neon.tech/database?sslmode=require"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Generate Database Migrations

```bash
npm run db:generate
```

#### Apply Migrations to Database

```bash
npm run db:migrate
```

#### Or Push Schema Directly (for development)

```bash
npm run db:push
```

#### Open Drizzle Studio (Database GUI)

```bash
npm run db:studio
```

### 4. Cloudflare Workers Configuration

Update `wrangler.jsonc` with your environment variables:

```jsonc
{
  "name": "backend",
  "main": "src/index.ts",
  "compatibility_date": "2025-05-29",
  "vars": {
    "DATABASE_URL": "your-neon-database-url",
  },
}
```

## Usage

### Import Aliases

The project is configured with clean import aliases for better organization:

```typescript
// Database
import { getDb, getDbFromEnv } from "@/db";
import { users, tests, questions } from "@/db/schema";

// Types (if you create them)
import type { User, Test } from "@/types";

// Utils (if you create them)
import { validateEmail } from "@/utils/validation";

// Services (if you create them)
import { TestService } from "@/services/test";
```

### Available Import Aliases

- `@/*` - Points to `src/*`
- `@/db/*` - Points to `src/db/*`
- `@/types/*` - Points to `src/types/*`
- `@/utils/*` - Points to `src/utils/*`
- `@/middleware/*` - Points to `src/middleware/*`
- `@/routes/*` - Points to `src/routes/*`
- `@/services/*` - Points to `src/services/*`

### Database Connection

The application provides multiple ways to connect to the database:

#### For Local Development

```typescript
import { getDb } from "@/db";

const db = getDb(); // Uses process.env.DATABASE_URL
```

#### For Cloudflare Workers

```typescript
import { getDbFromEnv } from "@/db";

// In your handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = getDbFromEnv(env);
    // Use db here
  },
};
```

### Example Database Operations

```typescript
import { getDb } from "@/db";
import { users, tests } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = getDb();

// Create a user
const newUser = await db
  .insert(users)
  .values({
    nik: "1234567890",
    name: "John Doe",
    email: "john@example.com",
    gender: "male",
    phone: "+62123456789",
    role: "participant",
  })
  .returning();

// Query users
const allUsers = await db.select().from(users);

// Update user
await db
  .update(users)
  .set({ name: "John Smith" })
  .where(eq(users.id, newUser[0].id));

// Delete user
await db.delete(users).where(eq(users.id, newUser[0].id));
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Apply migrations to database
- `npm run db:push` - Push schema directly to database
- `npm run db:studio` - Open Drizzle Studio

## Project Structure

```
src/
├── db/
│   ├── index.ts          # Database connection setup
│   └── schema.ts         # Database schema definitions
├── example/
│   └── usage.ts          # Usage examples with clean imports
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── middleware/           # Hono middleware
├── routes/               # API routes
├── services/             # Business logic services
└── index.ts             # Application entry point
```

## Schema Features

### Enums

- User roles (admin, participant)
- Gender, religion, education levels
- Question types (multiple_choice, true_false, text, etc.)
- Test and session statuses
- Participant statuses (invited, registered, started, completed, no_show)

### Key Tables

- `users` - User management with demographic info
- `tests` - Test definitions with metadata
- `questions` - Flexible question system
- `test_sessions` - Session management
- `test_attempts` - User attempts tracking
- `test_results` - Detailed results storage
- `session_participants` - Participant status tracking

### Relationships

- Foreign key constraints
- Proper indexing for performance
- Audit trail capabilities

## Development

1. **Local Development**: Use `getDb()` function
2. **Production**: Use `getDbFromEnv(env)` in Workers
3. **Migrations**: Always generate migrations for schema changes
4. **Type Safety**: Full TypeScript support with inferred types
5. **Clean Imports**: Use path aliases for better organization

## Deployment

1. Set up your environment variables in `wrangler.jsonc`
2. Run migrations: `npm run db:migrate`
3. Deploy: `npm run deploy`

For more information, see the [Drizzle documentation](https://orm.drizzle.team/) and [Neon documentation](https://neon.tech/docs).

## CSV Bulk Import

### Format CSV Syntegra

Backend ini mendukung bulk import user dari file CSV dengan format yang sesuai dengan database karyawan Syntegra.

#### Required Headers (Kolom Wajib)

- `NIK KTP` - Nomor Induk Kependudukan (16 digit)
- `NAMA` - Nama lengkap karyawan
- `E-MAIL` - Email address
- `SEX` - Jenis kelamin (L/P)
- `NOMOR HP` - Nomor HP/telepon

#### Optional Headers (Kolom Opsional)

- `TEMPAT LAHIR` - Tempat lahir
- `TANGGAL LAHIR` - Tanggal lahir (format DD/MM/YYYY)
- `AGAMA` - Agama
- `PENDIDIKAN TERAKHIR` - Tingkat pendidikan
- `ALAMAT KTP` - Alamat lengkap

#### Format File CSV

```csv
NO,ID KARYAWAN,NAMA,JABATAN,DIVISI,CABANG,KODE CABANG,JENIS KARYAWAN,TMK,SEX,NIK KTP,TEMPAT LAHIR,TANGGAL LAHIR,ALAMAT KTP,STATUS PERNIKAHAN,AGAMA,PENDIDIKAN TERAKHIR,NOMOR HP,NAMA IBU KANDUNG,NPWP,E-MAIL,BPJS KETENAGAKERJAAN,BPJS KESEHATAN,STATUS KARYAWAN,KONTRAK KERJA,HABIS KONTRAK,TANGGAL KELUAR,KET,TAKE HOME PAY
1,O-31-010724-00001,JOHN DOE,STAFF,PERUSAHAAN,HEAD OFFICE,31,ORGANIK,01/07/2024,L,1234567890123456,JAKARTA,01/01/1990,JL. EXAMPLE NO. 1,K1,ISLAM,S1,081234567890,IBU DOE,123456789012345,john.doe@example.com,,,,AKTIF,,,,,
```

### API Endpoints

#### 1. Validate CSV

```
POST /api/users/bulk/validate-csv
```

**Request Body:**

```json
{
  "csv_content": "NO,ID KARYAWAN,NAMA...\n1,O-31-010724-00001,JOHN DOE...",
  "file_name": "database_karyawan.csv",
  "options": {
    "skip_duplicates": false,
    "validate_only": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Syntegra CSV file validated successfully",
  "data": {
    "file_info": {
      "total_rows": 200,
      "data_rows": 195,
      "headers_found": ["NO", "NAMA", "NIK KTP", ...],
      "header_row": 5,
      "data_start_row": 6
    },
    "column_mapping": {
      "nik": "NIK KTP",
      "name": "NAMA",
      "email": "E-MAIL",
      "gender": "SEX",
      "phone": "NOMOR HP"
    },
    "validation_summary": {
      "valid_rows": 190,
      "invalid_rows": 5,
      "duplicate_niks": 0,
      "duplicate_emails": 0
    },
    "preview_results": [...]
  }
}
```

#### 2. Create Users from CSV

```
POST /api/users/bulk/csv
```

**Request Body:**

```json
{
  "csv_content": "NO,ID KARYAWAN,NAMA...\n1,O-31-010724-00001,JOHN DOE...",
  "file_name": "database_karyawan.csv",
  "options": {
    "skip_duplicates": true,
    "validate_only": false
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bulk user creation from CSV completed. 190 users created, 5 failed, 0 skipped",
  "data": {
    "total_processed": 195,
    "successful": 190,
    "failed": 5,
    "skipped": 0,
    "results": [...],
    "summary": {
      "duplicates_found": 0,
      "validation_errors": 5,
      "database_errors": 0
    }
  }
}
```

### Data Transformation

#### Gender Mapping

- `L`, `Laki`, `Laki-laki`, `Male`, `M` → `male`
- `P`, `Perempuan`, `Female`, `F` → `female`

#### Phone Number Normalization

- Format Indonesia: `081234567890` → `+6281234567890`
- International format: sudah ada `+` prefix akan dipertahankan

#### Date Format

- Indonesian format: `01/01/1990` → `1990-01-01T00:00:00.000Z`
- ISO format: langsung dikonversi

#### Religion Mapping

- `Islam`, `Muslim` → `islam`
- `Kristen`, `Christian`, `Katolik`, `Catholic` → `christian`
- `Buddha`, `Budha`, `Buddhist` → `buddhist`
- `Hindu` → `hindu`
- `Konghucu`, `Confucian` → `confucian`
- Lainnya → `other`

#### Education Mapping

- `SD`, `Sekolah Dasar` → `elementary`
- `SMP`, `Sekolah Menengah Pertama` → `junior_high`
- `SMA`, `SMK`, `SLTA` → `senior_high`
- `D1`, `D2`, `D3`, `D4`, `Diploma` → `diploma_1/2/3/4`
- `S1`, `Sarjana`, `Bachelor` → `bachelor`
- `S2`, `Master`, `Magister` → `master`
- `S3`, `Doktor`, `PhD` → `doctorate`

### Error Handling

API akan mengembalikan error yang detail untuk:

- Missing required columns
- Invalid data format
- Duplicate NIK/email
- Database constraints
- File parsing errors

### Authentication

Semua bulk operations memerlukan:

- Valid JWT token
- Role `admin`

### Rate Limiting

- General API calls: Standard rate limit
- Bulk operations: Khusus untuk admin only

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Deploy to Cloudflare Workers
pnpm deploy
```

## Environment Variables

```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-jwt-secret
BCRYPT_ROUNDS=10
NODE_ENV=development
```
