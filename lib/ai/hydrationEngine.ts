import type { DrinkLog, DailyStats, UserProfile } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HourlyBucket {
  hour: number;       // 0-23
  avgMl: number;
  drinkCount: number;
}

export interface WeekdayBucket {
  day: number;        // 0=Sun … 6=Sat
  label: string;
  avgMl: number;
  goalHitRate: number; // 0-1
}

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'no_data';

export interface PaceInfo {
  status: PaceStatus;
  diffMl: number;     // positive = ahead, negative = behind
  expectedMl: number;
  actualMl: number;
}

export interface WeeklyInsight {
  type: 'best_day' | 'worst_day' | 'pace_trend' | 'streak_trend' | 'goal_rate' | 'total_week' | 'afternoon_slump' | 'morning_start';
  text: string;
  emoji: string;
}

export interface WeeklyScore {
  score: number;        // 0-100
  goalHitDays: number;
  totalDays: number;
  avgDailyMl: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Hourly Pattern ───────────────────────────────────────────────────────────

export function getHourlyPattern(logs: DrinkLog[]): HourlyBucket[] {
  if (logs.length === 0) {
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, avgMl: 0, drinkCount: 0 }));
  }

  // Group by day to get number of distinct days
  const daySet = new Set(logs.map((l) => dayKey(l.timestamp)));
  const numDays = Math.max(daySet.size, 1);

  const buckets: { totalMl: number; count: number }[] = Array.from(
    { length: 24 },
    () => ({ totalMl: 0, count: 0 })
  );

  for (const log of logs) {
    const hour = new Date(log.timestamp).getHours();
    buckets[hour].totalMl += log.amount;
    buckets[hour].count += 1;
  }

  return buckets.map((b, h) => ({
    hour: h,
    avgMl: Math.round(b.totalMl / numDays),
    drinkCount: Math.round(b.count / numDays),
  }));
}

// ── Day-of-Week Pattern ──────────────────────────────────────────────────────

export function getDayOfWeekPattern(logs: DrinkLog[], goal: number): WeekdayBucket[] {
  const weekBuckets: { totalMl: number; days: Set<string>; goalHits: number }[] = Array.from(
    { length: 7 },
    () => ({ totalMl: 0, days: new Set<string>(), goalHits: 0 })
  );

  // Group logs by date
  const byDate = new Map<string, { day: number; total: number }>();
  for (const log of logs) {
    const d = new Date(log.timestamp);
    const key = dayKey(log.timestamp);
    const existing = byDate.get(key);
    if (existing) {
      existing.total += log.amount;
    } else {
      byDate.set(key, { day: d.getDay(), total: log.amount });
    }
  }

  for (const [key, { day, total }] of byDate) {
    weekBuckets[day].totalMl += total;
    weekBuckets[day].days.add(key);
    if (total >= goal) weekBuckets[day].goalHits += 1;
  }

  return weekBuckets.map((b, i) => {
    const numDays = Math.max(b.days.size, 1);
    return {
      day: i,
      label: DAY_LABELS[i],
      avgMl: Math.round(b.totalMl / numDays),
      goalHitRate: b.days.size > 0 ? b.goalHits / b.days.size : 0,
    };
  });
}

// ── Pace Tracking ────────────────────────────────────────────────────────────

export function getPaceStatus(
  todayLogs: DrinkLog[],
  hourlyPattern: HourlyBucket[]
): PaceInfo {
  const now = new Date();
  const currentHour = now.getHours();

  // Sum expected ml up to current hour (based on historical pattern)
  const expectedMl = hourlyPattern
    .filter((b) => b.hour <= currentHour)
    .reduce((sum, b) => sum + b.avgMl, 0);

  const actualMl = todayLogs.reduce((sum, l) => sum + l.amount, 0);

  if (expectedMl === 0) {
    return { status: 'no_data', diffMl: 0, expectedMl: 0, actualMl };
  }

  const diffMl = actualMl - expectedMl;
  const ratio = actualMl / expectedMl;

  let status: PaceStatus;
  if (ratio >= 1.1) status = 'ahead';
  else if (ratio >= 0.8) status = 'on_track';
  else status = 'behind';

  return { status, diffMl, expectedMl, actualMl };
}

// ── Weekly Insights ──────────────────────────────────────────────────────────

export function getWeeklyInsights(
  logs: DrinkLog[],
  dailyStats: DailyStats[],
  goal: number
): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];

  if (dailyStats.length === 0) return insights;

  // Goal hit rate
  const goalHitDays = dailyStats.filter((d) => d.goalMet).length;
  const totalDays = dailyStats.length;
  insights.push({
    type: 'goal_rate',
    text: `You hit your goal ${goalHitDays} of the last ${totalDays} days`,
    emoji: goalHitDays >= totalDays * 0.7 ? '🎯' : '📊',
  });

  // Total week
  const totalWeek = dailyStats.reduce((s, d) => s + d.totalMl, 0);
  const avgDaily = Math.round(totalWeek / totalDays);
  insights.push({
    type: 'total_week',
    text: `Average daily intake: ${avgDaily} ml`,
    emoji: avgDaily >= goal ? '💪' : '📈',
  });

  // Best & worst days
  const dayPattern = getDayOfWeekPattern(logs, goal);
  const activeDays = dayPattern.filter((d) => d.avgMl > 0);
  if (activeDays.length >= 2) {
    const best = activeDays.reduce((a, b) => (a.avgMl > b.avgMl ? a : b));
    const worst = activeDays.reduce((a, b) => (a.avgMl < b.avgMl ? a : b));

    if (best.day !== worst.day) {
      insights.push({
        type: 'best_day',
        text: `${best.label}s are your best — averaging ${best.avgMl} ml`,
        emoji: '🏆',
      });
      insights.push({
        type: 'worst_day',
        text: `${worst.label}s need work — only ${worst.avgMl} ml on average`,
        emoji: '⚡',
      });
    }
  }

  // Afternoon slump detection
  const hourPattern = getHourlyPattern(logs);
  const morningAvg =
    hourPattern.filter((h) => h.hour >= 6 && h.hour < 12).reduce((s, h) => s + h.avgMl, 0) / 6;
  const afternoonAvg =
    hourPattern.filter((h) => h.hour >= 12 && h.hour < 18).reduce((s, h) => s + h.avgMl, 0) / 6;

  if (morningAvg > 0 && afternoonAvg < morningAvg * 0.5) {
    insights.push({
      type: 'afternoon_slump',
      text: `Your afternoon hydration drops significantly — set a 2 PM reminder`,
      emoji: '☀️',
    });
  }

  return insights.slice(0, 5); // Cap at 5 insights
}

// ── Weekly Score ──────────────────────────────────────────────────────────────

export function getWeeklyScore(dailyStats: DailyStats[], goal: number): WeeklyScore {
  if (dailyStats.length === 0) {
    return { score: 0, goalHitDays: 0, totalDays: 0, avgDailyMl: 0 };
  }

  const totalDays = dailyStats.length;
  const goalHitDays = dailyStats.filter((d) => d.goalMet).length;
  const totalMl = dailyStats.reduce((s, d) => s + d.totalMl, 0);
  const avgDailyMl = Math.round(totalMl / totalDays);

  // Score: 60% goal compliance, 25% average intake ratio, 15% consistency
  const goalScore = (goalHitDays / totalDays) * 60;
  const intakeScore = Math.min(avgDailyMl / goal, 1.2) * (25 / 1.2);

  // Consistency: low variance is better
  const values = dailyStats.map((d) => d.totalMl);
  const mean = totalMl / totalDays;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / totalDays;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // coefficient of variation
  const consistencyScore = Math.max(0, (1 - cv) * 15);

  const score = Math.round(Math.min(goalScore + intakeScore + consistencyScore, 100));

  return { score, goalHitDays, totalDays, avgDailyMl };
}

// ── Goal Recommendation ──────────────────────────────────────────────────────

export function recommendGoal(profile: UserProfile): number {
  const weight = profile.weight ?? 70;

  const activityMultiplier: Record<string, number> = {
    sedentary: 1.0,
    moderate: 1.15,
    active: 1.3,
    very_active: 1.5,
  };

  const climateMultiplier: Record<string, number> = {
    cold: 0.9,
    temperate: 1.0,
    hot: 1.15,
    tropical: 1.3,
  };

  const base = weight * 33;
  const activity = activityMultiplier[profile.activityLevel ?? 'moderate'] ?? 1.15;
  const climate = climateMultiplier[profile.climate ?? 'temperate'] ?? 1.0;

  const raw = base * activity * climate;
  return Math.round(raw / 100) * 100; // round to nearest 100
}
