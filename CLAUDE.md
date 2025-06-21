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