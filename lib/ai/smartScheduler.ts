import type { DrinkLog } from '@/lib/db';
import { getHourlyPattern, type HourlyBucket } from './hydrationEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleResult {
  nextReminderMs: number;   // milliseconds until next reminder
  reason: string;           // human-readable explanation
  isAdaptive: boolean;      // true if using pattern data, false if fallback
}

// ── Smart Scheduler ──────────────────────────────────────────────────────────

/**
 * Calculate the next optimal reminder time based on drinking patterns.
 * 
 * Strategy:
 * 1. Build the user's hourly drinking pattern from recent logs
 * 2. Look at current hour and find the next "expected drinking hour"
 *    where they usually have water but haven't today
 * 3. Schedule the reminder for that gap
 * 4. Fallback to fixed interval if insufficient data
 */
export function getNextReminderDelay(
  recentLogs: DrinkLog[],     // last 7 days of logs
  todayLogs: DrinkLog[],      // today's logs
  fallbackMinutes: number     // user-configured fixed interval
): ScheduleResult {
  const MIN_DAYS_FOR_ADAPTIVE = 3;
  const MIN_DELAY_MS = 10 * 60 * 1000;      // at least 10 minutes
  const MAX_DELAY_MS = 180 * 60 * 1000;     // at most 3 hours

  // Check if we have enough data for adaptive scheduling
  const daySet = new Set(
    recentLogs.map((l) => new Date(l.timestamp).toDateString())
  );

  if (daySet.size < MIN_DAYS_FOR_ADAPTIVE) {
    return {
      nextReminderMs: fallbackMinutes * 60 * 1000,
      reason: `Fixed interval: ${fallbackMinutes} min (building your pattern — ${daySet.size}/${MIN_DAYS_FOR_ADAPTIVE} days)`,
      isAdaptive: false,
    };
  }

  const pattern = getHourlyPattern(recentLogs);
  const now = new Date();
  const currentHour = now.getHours();

  // Find hours where the user typically drinks
  const drinkingHours = pattern.filter(
    (b) => b.avgMl > 0 && b.drinkCount > 0
  );

  if (drinkingHours.length === 0) {
    return {
      nextReminderMs: fallbackMinutes * 60 * 1000,
      reason: `Fixed interval: ${fallbackMinutes} min (no pattern detected)`,
      isAdaptive: false,
    };
  }

  // Check which hours TODAY have been covered
  const todayHours = new Set(
    todayLogs.map((l) => new Date(l.timestamp).getHours())
  );

  // Find the next uncovered drinking hour
  const upcomingGaps = drinkingHours
    .filter((b) => b.hour > currentHour && !todayHours.has(b.hour))
    .sort((a, b) => a.hour - b.hour);

  if (upcomingGaps.length > 0) {
    const nextGapHour = upcomingGaps[0].hour;
    const delayMs = getDelayToHour(now, nextGapHour);

    return {
      nextReminderMs: clampDelay(delayMs, MIN_DELAY_MS, MAX_DELAY_MS),
      reason: `You usually drink around ${formatHour(nextGapHour)} — reminder set`,
      isAdaptive: true,
    };
  }

  // No upcoming gaps — check if there's a drinking hour in the current hour
  // that hasn't been fulfilled
  const currentBucket = pattern.find((b) => b.hour === currentHour);
  if (currentBucket && currentBucket.avgMl > 0 && !todayHours.has(currentHour)) {
    return {
      nextReminderMs: MIN_DELAY_MS,
      reason: `You usually drink this hour — gentle nudge`,
      isAdaptive: true,
    };
  }

  // All today's expected hours are covered — use longest gap pattern
  const lastDrinkTime = todayLogs.length > 0
    ? Math.max(...todayLogs.map((l) => l.timestamp))
    : now.getTime();

  const avgGapMs = calculateAverageGap(recentLogs);
  const timeSinceLastDrink = now.getTime() - lastDrinkTime;
  const remainingMs = Math.max(avgGapMs - timeSinceLastDrink, MIN_DELAY_MS);

  return {
    nextReminderMs: clampDelay(remainingMs, MIN_DELAY_MS, MAX_DELAY_MS),
    reason: `Based on your average gap between drinks`,
    isAdaptive: true,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDelayToHour(now: Date, targetHour: number): number {
  const target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);
  return target.getTime() - now.getTime();
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h} ${period}`;
}

function clampDelay(ms: number, min: number, max: number): number {
  return Math.max(min, Math.min(ms, max));
}

function calculateAverageGap(logs: DrinkLog[]): number {
  if (logs.length < 2) return 60 * 60 * 1000; // default 1 hour

  // Group logs by day, then calculate average within-day gap
  const byDay = new Map<string, number[]>();
  for (const log of logs) {
    const day = new Date(log.timestamp).toDateString();
    const arr = byDay.get(day) ?? [];
    arr.push(log.timestamp);
    byDay.set(day, arr);
  }

  const gaps: number[] = [];
  for (const timestamps of byDay.values()) {
    const sorted = timestamps.sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(sorted[i] - sorted[i - 1]);
    }
  }

  if (gaps.length === 0) return 60 * 60 * 1000;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}
