import type { PaceInfo } from './hydrationEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CoachMessage {
  text: string;
  emoji: string;
  priority: 'normal' | 'celebration' | 'warning' | 'tip';
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

interface MessageContext {
  timeOfDay: TimeOfDay;
  fillRatio: number;       // 0-1+
  paceInfo: PaceInfo;
  streak: number;
  totalToday: number;
  goal: number;
  cups: number;
}

// ── Time Helpers ─────────────────────────────────────────────────────────────

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Message Templates ────────────────────────────────────────────────────────

const HYDRATION_FACTS: CoachMessage[] = [
  { text: 'Even 2% dehydration can reduce cognitive performance by 20%', emoji: '🧠', priority: 'tip' },
  { text: 'Morning hydration boosts your metabolism by up to 24%', emoji: '☀️', priority: 'tip' },
  { text: 'Water helps your body flush out toxins through your kidneys', emoji: '💎', priority: 'tip' },
  { text: 'Staying hydrated can help reduce headaches by up to 50%', emoji: '✨', priority: 'tip' },
  { text: 'Your brain is 75% water — keep it sharp!', emoji: '⚡', priority: 'tip' },
  { text: 'Cold water boosts calorie burning — your body warms it up', emoji: '❄️', priority: 'tip' },
  { text: 'Dehydration makes your blood thicker, straining your heart', emoji: '❤️', priority: 'tip' },
  { text: 'Proper hydration improves your skin elasticity and glow', emoji: '✨', priority: 'tip' },
  { text: 'Water lubricates your joints — stay active, stay hydrated', emoji: '🏃', priority: 'tip' },
  { text: 'Drinking water before meals can help with portion control', emoji: '🍽️', priority: 'tip' },
  { text: 'Hydration helps regulate body temperature during exercise', emoji: '🌡️', priority: 'tip' },
  { text: 'Your muscles are about 80% water — fuel them right', emoji: '💪', priority: 'tip' },
];

const MORNING_MESSAGES: CoachMessage[] = [
  { text: 'Good morning! Start your day with a glass of water', emoji: '🌅', priority: 'normal' },
  { text: 'Rise and hydrate — your body lost water overnight', emoji: '☀️', priority: 'normal' },
  { text: 'A morning glass of water kickstarts your metabolism', emoji: '⚡', priority: 'tip' },
  { text: 'Your cells have been waiting all night — give them water!', emoji: '🌊', priority: 'normal' },
];

const AFTERNOON_MESSAGES: CoachMessage[] = [
  { text: 'Afternoon slump? Water is nature\'s energy drink', emoji: '☀️', priority: 'normal' },
  { text: 'The midday dip is real — hydration helps you power through', emoji: '💪', priority: 'normal' },
  { text: 'Stay consistent through the afternoon — you\'ve got this', emoji: '🎯', priority: 'normal' },
];

const EVENING_MESSAGES: CoachMessage[] = [
  { text: 'Evening wind-down: one more glass before bed?', emoji: '🌙', priority: 'normal' },
  { text: 'Hydrating now helps your body recover overnight', emoji: '💤', priority: 'tip' },
  { text: 'Last push of the day — finish strong!', emoji: '🏁', priority: 'normal' },
];

const NIGHT_MESSAGES: CoachMessage[] = [
  { text: 'A small sip before sleep keeps you hydrated overnight', emoji: '🌙', priority: 'tip' },
  { text: 'Night owl? Your body still needs water', emoji: '🦉', priority: 'normal' },
];

const TIME_MESSAGES: Record<TimeOfDay, CoachMessage[]> = {
  morning: MORNING_MESSAGES,
  afternoon: AFTERNOON_MESSAGES,
  evening: EVENING_MESSAGES,
  night: NIGHT_MESSAGES,
};

// ── Contextual Message Picker ────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCelebrationMessage(ctx: MessageContext): CoachMessage | null {
  if (ctx.fillRatio >= 1) {
    const msgs: CoachMessage[] = [
      { text: `You crushed it! ${ctx.totalToday} ml today — goal complete!`, emoji: '🎉', priority: 'celebration' },
      { text: 'Daily goal smashed — your body thanks you!', emoji: '🏆', priority: 'celebration' },
      { text: `${ctx.cups} glasses done! You\'re fully hydrated today`, emoji: '💧', priority: 'celebration' },
    ];
    return pickRandom(msgs);
  }
  return null;
}

function getStreakMessage(ctx: MessageContext): CoachMessage | null {
  if (ctx.streak >= 7) {
    return { text: `${ctx.streak}-day streak! You're building an amazing habit`, emoji: '🔥', priority: 'celebration' };
  }
  if (ctx.streak >= 3) {
    return { text: `${ctx.streak} days strong — keep the streak alive!`, emoji: '🔥', priority: 'normal' };
  }
  if (ctx.streak === 1) {
    return { text: 'Day 1 of a new streak — let\'s make it count!', emoji: '🌱', priority: 'normal' };
  }
  return null;
}

function getPaceMessage(ctx: MessageContext): CoachMessage | null {
  const { paceInfo } = ctx;
  if (paceInfo.status === 'no_data') return null;

  if (paceInfo.status === 'ahead' && paceInfo.diffMl > 200) {
    return {
      text: `You're ${paceInfo.diffMl} ml ahead of your usual pace — impressive!`,
      emoji: '🚀',
      priority: 'normal',
    };
  }
  if (paceInfo.status === 'behind' && paceInfo.diffMl < -300) {
    return {
      text: `You're ${Math.abs(paceInfo.diffMl)} ml behind your usual pace — time to catch up`,
      emoji: '⏰',
      priority: 'warning',
    };
  }
  if (paceInfo.status === 'on_track') {
    return { text: 'You\'re right on pace — great rhythm today!', emoji: '✅', priority: 'normal' };
  }
  return null;
}

function getProgressMessage(ctx: MessageContext): CoachMessage | null {
  const pct = Math.round(ctx.fillRatio * 100);
  if (pct === 0) return null;

  if (pct >= 75 && pct < 100) {
    const remaining = ctx.goal - ctx.totalToday;
    return {
      text: `Almost there! Just ${remaining} ml to reach your goal`,
      emoji: '🎯',
      priority: 'normal',
    };
  }
  if (pct >= 50 && pct < 75) {
    return { text: `Halfway there — ${pct}% done. Keep going!`, emoji: '💧', priority: 'normal' };
  }
  if (pct >= 25 && pct < 50) {
    return { text: `Good start — ${pct}% of your goal logged`, emoji: '📈', priority: 'normal' };
  }
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a contextual coach message based on current state.
 * Prioritises celebration > streak > pace > progress > time-of-day > facts.
 */
export function getCoachMessage(
  fillRatio: number,
  totalToday: number,
  goal: number,
  cups: number,
  streak: number,
  paceInfo: PaceInfo
): CoachMessage {
  const ctx: MessageContext = {
    timeOfDay: getTimeOfDay(),
    fillRatio,
    paceInfo,
    streak,
    totalToday,
    goal,
    cups,
  };

  // Priority cascade
  const celebration = getCelebrationMessage(ctx);
  if (celebration && Math.random() < 0.7) return celebration;

  const streakMsg = getStreakMessage(ctx);
  if (streakMsg && Math.random() < 0.5) return streakMsg;

  const paceMsg = getPaceMessage(ctx);
  if (paceMsg && Math.random() < 0.6) return paceMsg;

  const progressMsg = getProgressMessage(ctx);
  if (progressMsg && Math.random() < 0.5) return progressMsg;

  // Time-of-day messages
  if (Math.random() < 0.5) {
    return pickRandom(TIME_MESSAGES[ctx.timeOfDay]);
  }

  // Fallback: hydration facts
  return pickRandom(HYDRATION_FACTS);
}

/**
 * Get a motivational banner message (shorter, more tip-oriented).
 * This is for the always-visible bottom text.
 */
export function getBannerMessage(
  fillRatio: number,
  totalToday: number,
  goal: number,
  streak: number
): CoachMessage {
  const timeOfDay = getTimeOfDay();
  const pct = Math.round(fillRatio * 100);

  // Goal complete
  if (fillRatio >= 1) {
    const msgs: CoachMessage[] = [
      { text: 'Goal reached — bonus hydration is always welcome!', emoji: '🎉', priority: 'celebration' },
      { text: 'You did it! Extra water keeps you performing at peak', emoji: '🏆', priority: 'celebration' },
    ];
    return pickRandom(msgs);
  }

  // Contextual mix
  const pool: CoachMessage[] = [];

  // Add time-of-day messages
  pool.push(...TIME_MESSAGES[timeOfDay]);

  // Add progress hints
  if (pct >= 75) {
    pool.push({ text: `Only ${goal - totalToday} ml left — you're so close!`, emoji: '🎯', priority: 'normal' });
  }

  // Add streak messages
  if (streak >= 3) {
    pool.push({ text: `${streak}-day streak — every glass keeps it alive`, emoji: '🔥', priority: 'normal' });
  }

  // Always include some facts
  pool.push(...HYDRATION_FACTS.slice(0, 4));

  return pickRandom(pool);
}
