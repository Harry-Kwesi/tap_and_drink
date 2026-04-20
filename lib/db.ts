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
}

export class TapDrinkDB extends Dexie {
  drinks!: Table<DrinkLog>;
  settings!: Table<AppSettings>;

  constructor() {
    super('TapDrinkDB');
    this.version(1).stores({
      drinks: '++id, timestamp',
      settings: '++id',
    });
  }
}

export const db = new TapDrinkDB();

// ── helpers ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const all = await db.settings.toArray();
  if (all.length) return all[0];
  const id = await db.settings.add({ dailyGoal: 2000, reminderInterval: 60 }) as number;
  return { id, dailyGoal: 2000, reminderInterval: 60 };
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
