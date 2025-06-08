import { Context } from "hono";
import { eq, and, count, sql, desc, gte, lte, avg } from "drizzle-orm";
import {
  getDbFromEnv,
  users,
  testAttempts,
  sessionParticipants,
  auditLogs,
} from "@/db";
import { type CloudflareBindings } from "@/lib/env";
import {
  type UserAnalyticsQuery,
  type UserAnalyticsResponse,
  type AnalyticsErrorResponse,
  getAnalyticsDateRange,
  calculatePercentageChange,
} from "shared-types";

export async function getUserAnalyticsHandler(
  c: Context<{ Bindings: CloudflareBindings; Variables: { user: any } }>
): Promise<Response> {
  try {
    const db = getDbFromEnv(c.env);
    const rawQuery = c.req.query();

    // Parse query parameters
    const queryParams: UserAnalyticsQuery = {
      period: (rawQuery.period as any) || "month",
      date_from: rawQuery.date_from,
      date_to: rawQuery.date_to,
      timezone: rawQuery.timezone || "Asia/Jakarta",
      role: rawQuery.role as any,
      gender: rawQuery.gender as any,
      education: rawQuery.education as any,
      province: rawQuery.province,
      include_demographics: rawQuery.include_demographics !== "false",
      include_activity: rawQuery.include_activity !== "false",
      group_by: (rawQuery.group_by as any) || "role",
    };

    // Get date range
    const { from, to } =
      queryParams.date_from && queryParams.date_to
        ? {
            from: new Date(queryParams.date_from),
            to: new Date(queryParams.date_to),
          }
        : getAnalyticsDateRange(queryParams.period);

    // Build filter conditions for users
    const userFilterConditions: any[] = [];
    if (queryParams.role) {
      userFilterConditions.push(eq(users.role, queryParams.role));
    }
    if (queryParams.gender) {
      userFilterConditions.push(eq(users.gender, queryParams.gender));
    }
    if (queryParams.education) {
      userFilterConditions.push(eq(users.education, queryParams.education));
    }
    if (queryParams.province) {
      userFilterConditions.push(eq(users.province, queryParams.province));
    }

    // Get user summary statistics
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(...userFilterConditions));

    const [activeUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          ...userFilterConditions,
          gte(users.last_login, from),
          lte(users.last_login, to)
        )
      );

    const [newUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          ...userFilterConditions,
          gte(users.created_at, from),
          lte(users.created_at, to)
        )
      );

    const [adminUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(...userFilterConditions, eq(users.role, "admin")));

    const [participantUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(and(...userFilterConditions, eq(users.role, "participant")));

    // Calculate login frequency
    const [totalLogins] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "login"),
          gte(auditLogs.created_at, from),
          lte(auditLogs.created_at, to)
        )
      );

    const averageLoginFrequency =
      activeUsers.count > 0
        ? Math.round((totalLogins.count / activeUsers.count) * 100) / 100
        : 0;

    // Calculate retention rate (users who logged in this period vs previous period)
    const previousPeriodStart = new Date(
      from.getTime() - (to.getTime() - from.getTime())
    );
    const [previousActiveUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          ...userFilterConditions,
          gte(users.last_login, previousPeriodStart),
          lte(users.last_login, from)
        )
      );

    const userRetentionRate =
      previousActiveUsers.count > 0
        ? Math.round((activeUsers.count / previousActiveUsers.count) * 100)
        : 100;

    const userSummary = {
      total_users: totalUsers.count,
      active_users: activeUsers.count,
      new_users_this_period: newUsers.count,
      admin_users: adminUsers.count,
      participant_users: participantUsers.count,
      average_login_frequency: averageLoginFrequency,
      user_retention_rate: userRetentionRate,
    };

    // Get demographics if requested
    let demographics = undefined;
    if (queryParams.include_demographics) {
      // Gender distribution
      const genderDistribution = await db
        .select({
          gender: users.gender,
          count: count(),
        })
        .from(users)
        .where(and(...userFilterConditions, sql`${users.gender} IS NOT NULL`))
        .groupBy(users.gender);

      // Education distribution
      const educationDistribution = await db
        .select({
          education: users.education,
          count: count(),
        })
        .from(users)
        .where(
          and(...userFilterConditions, sql`${users.education} IS NOT NULL`)
        )
        .groupBy(users.education);

      // Province distribution
      const provinceDistribution = await db
        .select({
          province: users.province,
          count: count(),
        })
        .from(users)
        .where(and(...userFilterConditions, sql`${users.province} IS NOT NULL`))
        .groupBy(users.province)
        .limit(20); // Top 20 provinces

      // Age distribution (calculated from birth_date)
      const ageDistribution = await db
        .select({
          age_group: sql<string>`
            CASE 
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) < 20 THEN 'Under 20'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 20 AND 25 THEN '20-25'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 26 AND 30 THEN '26-30'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 31 AND 35 THEN '31-35'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 36 AND 40 THEN '36-40'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 41 AND 50 THEN '41-50'
              WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) > 50 THEN 'Over 50'
              ELSE 'Unknown'
            END
          `,
          count: count(),
        })
        .from(users)
        .where(
          and(...userFilterConditions, sql`${users.birth_date} IS NOT NULL`)
        ).groupBy(sql`
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) < 20 THEN 'Under 20'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 20 AND 25 THEN '20-25'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 26 AND 30 THEN '26-30'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 31 AND 35 THEN '31-35'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 36 AND 40 THEN '36-40'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) BETWEEN 41 AND 50 THEN '41-50'
            WHEN EXTRACT(YEAR FROM AGE(${users.birth_date})) > 50 THEN 'Over 50'
            ELSE 'Unknown'
          END
        `);

      demographics = {
        gender_distribution: genderDistribution.reduce(
          (acc, item) => {
            if (item.gender) {
              acc[item.gender] = item.count;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
        education_distribution: educationDistribution.reduce(
          (acc, item) => {
            if (item.education) {
              acc[item.education] = item.count;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
        province_distribution: provinceDistribution.reduce(
          (acc, item) => {
            if (item.province) {
              acc[item.province] = item.count;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
        age_distribution: ageDistribution.reduce(
          (acc, item) => {
            acc[item.age_group] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }

    // Get activity data if requested
    let activityData = undefined;
    if (queryParams.include_activity) {
      const userActivities = await db
        .select({
          user_id: users.id,
          name: users.name,
          email: users.email,
          last_activity: users.last_login,
          total_logins: count(auditLogs.id),
          total_tests_taken: sql<number>`COUNT(DISTINCT ${testAttempts.id})`,
          total_sessions_joined: sql<number>`COUNT(DISTINCT ${sessionParticipants.session_id})`,
        })
        .from(users)
        .leftJoin(
          auditLogs,
          and(
            eq(auditLogs.user_id, users.id),
            eq(auditLogs.action, "login"),
            gte(auditLogs.created_at, from),
            lte(auditLogs.created_at, to)
          )
        )
        .leftJoin(
          testAttempts,
          and(
            eq(testAttempts.user_id, users.id),
            gte(testAttempts.start_time, from),
            lte(testAttempts.start_time, to)
          )
        )
        .leftJoin(
          sessionParticipants,
          eq(sessionParticipants.user_id, users.id)
        )
        .where(and(...userFilterConditions))
        .groupBy(users.id, users.name, users.email, users.last_login)
        .orderBy(desc(count(auditLogs.id)))
        .limit(50);

      activityData = userActivities.map((activity) => {
        // Calculate activity score (simple formula)
        const activityScore =
          activity.total_logins * 1 +
          Number(activity.total_tests_taken) * 5 +
          Number(activity.total_sessions_joined) * 3;

        return {
          user_id: activity.user_id,
          name: activity.name,
          email: activity.email,
          total_logins: activity.total_logins,
          total_tests_taken: Number(activity.total_tests_taken) || 0,
          total_sessions_joined: Number(activity.total_sessions_joined) || 0,
          last_activity:
            activity.last_activity?.toISOString() || new Date(0).toISOString(),
          activity_score: activityScore,
        };
      });
    }

    // Get trends
    let trends = undefined;
    const daysDiff = Math.ceil(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    const maxPoints = Math.min(daysDiff, 30);

    trends = [];
    for (let i = 0; i < maxPoints; i++) {
      const date = new Date(
        from.getTime() + (i * (to.getTime() - from.getTime())) / maxPoints
      );
      const nextDate = new Date(
        from.getTime() + ((i + 1) * (to.getTime() - from.getTime())) / maxPoints
      );

      const [newRegistrations] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            ...userFilterConditions,
            gte(users.created_at, date),
            lte(users.created_at, nextDate)
          )
        );

      const [dayActiveUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            ...userFilterConditions,
            gte(users.last_login, date),
            lte(users.last_login, nextDate)
          )
        );

      const [dayLogins] = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, "login"),
            gte(auditLogs.created_at, date),
            lte(auditLogs.created_at, nextDate)
          )
        );

      // Calculate retention rate for this day compared to previous day
      const previousDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
      const [previousDayActiveUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            ...userFilterConditions,
            gte(users.last_login, previousDate),
            lte(users.last_login, date)
          )
        );

      const retentionRate =
        previousDayActiveUsers.count > 0
          ? Math.round(
              (dayActiveUsers.count / previousDayActiveUsers.count) * 100
            )
          : 100;

      trends.push({
        date: date.toISOString().split("T")[0],
        new_registrations: newRegistrations.count,
        active_users: dayActiveUsers.count,
        total_logins: dayLogins.count,
        retention_rate: retentionRate,
      });
    }

    const response: UserAnalyticsResponse = {
      success: true,
      data: {
        user_summary: userSummary,
        demographics,
        activity_data: activityData,
        trends,
        metadata: {
          total_records: totalUsers.count,
          period_start: from.toISOString(),
          period_end: to.toISOString(),
          generated_at: new Date().toISOString(),
          data_freshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error getting user analytics:", error);

    const errorResponse: AnalyticsErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to retrieve user analytics",
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(errorResponse, 500);
  }
}
