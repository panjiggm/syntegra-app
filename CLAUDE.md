# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Syntegra is a full-stack psychological testing platform built as a monorepo using pnpm workspaces. The platform enables administration of psychological tests, participant management, and comprehensive results analysis.

## Architecture

**Monorepo Structure:**

- `apps/backend` - Hono.js API running on Cloudflare Workers with Neon PostgreSQL
- `apps/vite` - **Primary frontend** using React Router v7, React 19, Vite, TailwindCSS v4
- `apps/frontend` - Secondary Next.js implementation (legacy)
- `packages/shared-types` - Shared TypeScript types and Zod schemas

**Key Technologies:**

- Backend: Hono.js, Drizzle ORM, Cloudflare Workers, JWT auth
- Frontend: React 19, React Router v7, Vite, TailwindCSS v4, shadcn/ui, Zustand, TanStack Query
- Database: Neon PostgreSQL with comprehensive psychological testing schema
- Package Manager: pnpm (>=10.11.0), Node.js (>=20.0.0)

## Essential Commands

**Development:**

```bash
pnpm dev                 # Start all apps
pnpm dev:backend         # Backend only
pnpm dev:vite           # Vite frontend only
```

**Database Operations:**

```bash
pnpm db:generate        # Generate Drizzle migrations
pnpm db:migrate         # Run migrations
pnpm db:push           # Push schema changes
pnpm db:studio         # Open Drizzle Studio
```

**Build & Deploy:**

```bash
pnpm build             # Build all apps
pnpm deploy            # Deploy all apps
pnpm lint              # Lint all code
pnpm type-check        # TypeScript checking
```

**Backend-specific:**

```bash
cd apps/backend
pnpm deploy:staging    # Deploy to staging
pnpm deploy:production # Deploy to production
```

## Code Architecture Patterns

**Backend Route Organization:**

- Modular route structure: `/routes/users/`, `/routes/tests/`, `/routes/sessions/`
- Each route group has index file, handlers, and operation-specific files
- Authentication middleware, rate limiting, and CORS configured
- Background job scheduling with Cloudflare Cron Triggers

**Frontend Architecture (Vite - Primary):**

- File-based routing with layout components (`_admin.tsx`, `_participant.tsx`, `_psikotes.tsx`)
- Co-located components in feature directories
- Zustand for client state, TanStack Query for server state
- React Hook Form + Zod for form validation

**Database Schema:**

- Core entities: Users, Tests, Questions, Sessions, Attempts, Results
- Flexible question types: multiple choice, true/false, text, rating scale, drawing, sequence, matrix
- Support for psychological test categories: WAIS, MBTI, Wartegg, RIASEC, Kraepelin, Pauli

## Development Guidelines

**File Naming:**

- Components: PascalCase
- Routes: kebab-case
- Hooks: camelCase with `use` prefix

**Import Patterns:**

- Use import aliases: `~/components/ui/button`
- Shared types from `@syntegra/shared-types`

**Component Structure:**

- Props interfaces defined inline or exported
- Error boundaries for route components
- Loading states and error handling

**API Integration:**

- TanStack Query for data fetching
- Centralized API client in `lib/api-client.ts`
- Zod schemas for request/response validation

## Environment Setup

**Required Environment Variables:**

- Backend: Database URL, JWT secrets (in `wrangler.jsonc`)
- Frontend: API endpoints, auth configuration

**Development Workflow:**

1. Install dependencies: `pnpm install`
2. Set up database connection in backend
3. Run migrations: `pnpm db:migrate`
4. Start development: `pnpm dev`

## Special Features

**Psychological Testing Platform:**

- Multi-module test support (intelligence, personality, aptitude, etc.)
- Session-based test administration with timing controls
- Bulk participant management via CSV import
- Comprehensive analytics and reporting system
- Role-based access control (admin/participant)

**Deployment:**

- Backend: Cloudflare Workers with environment-specific configurations
- Frontend: Cloudflare Pages (Vite app is primary deployment target)
- Database: Neon PostgreSQL with connection pooling

## API Testing Examples

**Question Creation Payloads for Postman:**

### 1. Multiple Choice Question

```json
POST /tests/{testId}/questions
{
  "question": "Apa ibu kota Indonesia?",
  "question_type": "multiple_choice",
  "sequence": 1,
  "time_limit": 30,
  "is_required": true,
  "options": [
    {
      "value": "A",
      "label": "Jakarta"
    },
    {
      "value": "B",
      "label": "Surabaya"
    },
    {
      "value": "C",
      "label": "Bandung"
    },
    {
      "value": "D",
      "label": "Medan"
    }
  ],
  "correct_answer": "A",
  "image_url": "https://example.com/map-indonesia.jpg"
}
```

### 2. True/False Question

```json
POST /tests/{testId}/questions
{
  "question": "Indonesia adalah negara kepulauan terbesar di dunia",
  "question_type": "true_false",
  "sequence": 2,
  "time_limit": 15,
  "is_required": true,
  "correct_answer": "true",
  "audio_url": "https://example.com/question-audio.mp3"
}
```

### 3. Rating Scale Question

```json
POST /tests/{testId}/questions
{
  "question": "Seberapa setuju Anda dengan pernyataan: 'Saya merasa nyaman bekerja dalam tim'?",
  "question_type": "rating_scale",
  "sequence": 3,
  "time_limit": 45,
  "is_required": true,
  "options": [
    {
      "value": "1",
      "label": "Sangat Tidak Setuju",
      "score": 1
    },
    {
      "value": "2",
      "label": "2",
      "score": 2
    },
    {
      "value": "3",
      "label": "3",
      "score": 3
    },
    {
      "value": "4",
      "label": "4",
      "score": 4
    },
    {
      "value": "5",
      "label": "Sangat Setuju",
      "score": 5
    }
  ],
  "scoring_key": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5
  }
}
```

**Required Headers:**

```
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}
```

**Notes:**

- Replace `{testId}` with valid test UUID
- `sequence` auto-calculated if not provided
- `time_limit` in seconds (optional, uses defaults)
- `is_required` defaults to `true`
- `image_url`/`audio_url` optional, supported by specific question types
- For `true_false`, backend auto-generates options
- `scoring_key` required for `rating_scale` questions

**Data Charts Tambahan yang Bisa Ditampilkan di Dashboard Admin**

1. Analisis Waktu & Tren

- Percobaan tes harian/mingguan/bulanan (line chart)
- Sesi dibuat per bulan (area chart)
- Waktu rata-rata penyelesaian tes (bar chart)

2. Distribusi Kategori & Modul

- Distribusi tes berdasarkan category (wais, mbti, wartegg, dll) - pie chart
- Distribusi tes berdasarkan module_type (intelligence, personality, dll) - donut chart

3. Performance Metrics

- Average completion rate per test
- Top performing tests (highest completion rates)
- Most challenging tests (lowest completion rates)
- Time efficiency per test category

4. Geographic & Demographic

- Distribusi peserta berdasarkan provinsi/wilayah
- Distribusi gender, pendidikan, agama
- Age distribution (dari birth_date)

Data ini semua tersedia dari tabel yang ada: users, tests, testSessions, testAttempts, sessionParticipants, participantTestProgress,
userAnswers, dll.
