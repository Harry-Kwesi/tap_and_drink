import Dexie, { type Table } from 'dexie';

export interface DrinkLog {
  id?: number;
  timestamp: number;
  amount: number; // ml
}

export interface AppSettings {
  id?: number;
  dailyGoal: number;       // ml, default 2000
  reminderInterval: number; // minutes, 30–120
  pushEndpoint?: string;   // serialised PushSubscription JSON
  smartReminders?: boolean; // adaptive reminder mode
}

export interface UserProfile {
  id?: number;
  weight?: number;                 // kg
  activityLevel?: 'sedentary' | 'moderate' | 'active' | 'very_active';
  climate?: 'cold' | 'temperate' | 'hot' | 'tropical';
  createdAt: number;
}

export interface DailyStats {
  id?: number;
  date: string;       // 'YYYY-MM-DD'
  totalMl: number;
  drinkCount: number;
  goalMet: boolean;
}

export class TapDrinkDB extends Dexie {
  drinks!: Table<DrinkLog>;
  settings!: Table<AppSettings>;
  userProfile!: Table<UserProfile>;
  dailyStats!: Table<DailyStats>;

  constructor() {
    super('TapDrinkDB');
    this.version(1).stores({
      drinks: '++id, timestamp',
      settings: '++id',
    });
    this.version(2).stores({
      drinks: '++id, timestamp',
      settings: '++id',
      userProfile: '++id',
      dailyStats: '++id, date',
    });
  }
}

export const db = new TapDrinkDB();

// ── helpers ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const all = await db.settings.toArray();
  if (all.length) return all[0];
  const id = await db.settings.add({ dailyGoal: 2000, reminderInterval: 60, smartReminders: false }) as number;
  return { id, dailyGoal: 2000, reminderInterval: 60, smartReminders: false };
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const s = await getSettings();
  await db.settings.update(s.id!, patch);
}

export async function logDrink(amount = 250) {
  return db.drinks.add({ timestamp: Date.now(), amount });
}

export async function getTodayDrinks(): Promise<DrinkLog[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db.drinks
    .where('timestamp')
    .aboveOrEqual(start.getTime())
    .toArray();
}

export async function getLastDrinkTime(): Promise<number | null> {
  const logs = await db.drinks.orderBy('timestamp').last();
  return logs?.timestamp ?? null;
}
export async function undoLastDrink(): Promise<DrinkLog | null> {
  const last = await db.drinks.orderBy('timestamp').last();
  if (!last?.id) return null;
  await db.drinks.delete(last.id);
  return last;
}

/** Count consecutive days (ending today) where daily goal was met */
export async function getStreak(dailyGoal: number): Promise<number> {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 365; offset++) {
    const dayStart = today.getTime() - offset * 86_400_000;
    const dayEnd   = dayStart + 86_400_000;
    const logs = await db.drinks
      .where('timestamp').between(dayStart, dayEnd, true, false).toArray();
    const total = logs.reduce((s, l) => s + l.amount, 0);
    if (total >= dailyGoal) {
      streak++;
    } else if (offset > 0) {
      break;
    }
  }
  return streak;
}

// ── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const all = await db.userProfile.toArray();
  return all.length > 0 ? all[0] : null;
}

export async function saveUserProfile(patch: Partial<UserProfile>) {
  const existing = await getUserProfile();
  if (existing?.id) {
    await db.userProfile.update(existing.id, patch);
  } else {
    await db.userProfile.add({ createdAt: Date.now(), ...patch });
  }
}

// ── Daily Stats ──────────────────────────────────────────────────────────────

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function upsertDailyStats(goal: number) {
  const date = todayDateString();
  const todayLogs = await getTodayDrinks();
  const totalMl = todayLogs.reduce((s, l) => s + l.amount, 0);
  const drinkCount = todayLogs.length;
  const goalMet = totalMl >= goal;

  const existing = await db.dailyStats.where('date').equals(date).first();
  if (existing?.id) {
    await db.dailyStats.update(existing.id, { totalMl, drinkCount, goalMet });
  } else {
    await db.dailyStats.add({ date, totalMl, drinkCount, goalMet });
  }
}

export async function getRecentStats(days: number): Promise<DailyStats[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

  return db.dailyStats
    .where('date')
    .aboveOrEqual(startStr)
    .toArray();
}

export async function getLogsForRange(startTs: number, endTs: number): Promise<DrinkLog[]> {
  return db.drinks
    .where('timestamp')
    .between(startTs, endTs, true, false)
    .toArray();
}

/** Get all logs from the last N days */
export async function getRecentLogs(days: number): Promise<DrinkLog[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return db.drinks
    .where('timestamp')
    .aboveOrEqual(start.getTime())
    .toArray();
}
