# Setup Guide - Backend Development

## 🚨 Database Configuration Required

Before running the backend application, you need to configure your Neon PostgreSQL database.

## Step 1: Create a Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up or log in to your account
3. Create a new project
4. Copy your database connection string

## Step 2: Configure Environment Variables

Edit `apps/backend/wrangler.jsonc` and update the `vars` section:

```jsonc
{
  "vars": {
    "DATABASE_URL": "postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/database?sslmode=require",
    "JWT_SECRET": "your-strong-jwt-secret-key",
    "FRONTEND_URL": "http://localhost:3000",
    "CORS_ORIGIN": "http://localhost:5173",
    "NODE_ENV": "development",
  },
}
```

### Required Variables:

- **DATABASE_URL**: Your Neon database connection string
- **JWT_SECRET**: Secret key for JWT authentication
- **FRONTEND_URL**: URL of your frontend application

### Optional Variables:

- **CORS_ORIGIN**: Additional CORS origin
- **NODE_ENV**: Environment mode (defaults to "development")

## Step 3: Setup Database Schema

After configuring the DATABASE_URL, run these commands:

```bash
# Navigate to backend directory
cd apps/backend

# Install dependencies
pnpm install

# Generate database migrations
pnpm run db:generate

# Apply migrations to your database
pnpm run db:migrate

# Optional: Open Drizzle Studio to view your database
pnpm run db:studio
```

## Step 4: Start Development Server

```bash
pnpm run dev
```

## Troubleshooting

### Error: "No database connection string was provided to neon()"

This means your `DATABASE_URL` is not configured properly. Make sure:

1. You have a valid Neon database URL
2. The URL is properly set in `wrangler.jsonc`
3. The URL follows this format: `postgresql://username:password@host/database?sslmode=require`

### Error: "Database not configured"

The application will return this error when `DATABASE_URL` is empty or missing. Configure it as described above.

### Need Help?

1. Check [Neon Documentation](https://neon.tech/docs) for database setup
2. Check [Drizzle Documentation](https://orm.drizzle.team/) for ORM usage
3. Ensure all environment variables are properly quoted in JSON format
