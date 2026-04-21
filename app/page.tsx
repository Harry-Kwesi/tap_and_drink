'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DrinkButton from '@/components/DrinkButton';
import ProgressArc from '@/components/ProgressArc';
import SettingsPanel from '@/components/SettingsPanel';
import DrinkHistory from '@/components/DrinkHistory';
import StreakBadge from '@/components/StreakBadge';
import AiCoach from '@/components/AiCoach';
import InsightsDashboard from '@/components/InsightsDashboard';
import NlpLogInput from '@/components/NlpLogInput';
import MotivationalBanner from '@/components/MotivationalBanner';
import { usePushReminder } from '@/lib/usePushReminder';
import {
  getSettings,
  getTodayDrinks,
  getStreak,
  logDrink,
  saveSettings,
  undoLastDrink,
  upsertDailyStats,
  getRecentLogs,
  type AppSettings,
  type DrinkLog,
} from '@/lib/db';
import {
  getHourlyPattern,
  getPaceStatus,
  type PaceInfo,
} from '@/lib/ai/hydrationEngine';

const AMOUNT_PER_TAP = 250;

interface FloatDrop { id: number; x: number; y: number; }

export default function Home() {
  const [settings, setSettings]         = useState<AppSettings | null>(null);
  const [logs, setLogs]                 = useState<DrinkLog[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [floats, setFloats]             = useState<FloatDrop[]>([]);
  const [goalHit, setGoalHit]           = useState(false);
  const [streak, setStreak]             = useState(0);
  const [undoFlash, setUndoFlash]       = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [paceInfo, setPaceInfo]         = useState<PaceInfo>({
    status: 'no_data', diffMl: 0, expectedMl: 0, actualMl: 0,
  });
  const dropIdRef = useRef(0);

  const { recordActivity } = usePushReminder(settings);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [s, drinks] = await Promise.all([getSettings(), getTodayDrinks()]);
      setSettings(s);
      setLogs(drinks);
      const total = drinks.reduce((a, d) => a + d.amount, 0);
      setGoalHit(total >= s.dailyGoal);
      const str = await getStreak(s.dailyGoal);
      setStreak(str);

      // Initial pace calculation
      try {
        const recentLogs = await getRecentLogs(7);
        const pattern = getHourlyPattern(recentLogs);
        setPaceInfo(getPaceStatus(drinks, pattern));
      } catch { /* pace stays no_data */ }

      // Ensure today's stats exist
      await upsertDailyStats(s.dailyGoal);
    }
    init();
  }, []);

  // ── Update pace after logs change ──────────────────────────────────────────
  const updatePace = useCallback(async (currentLogs: DrinkLog[]) => {
    try {
      const recentLogs = await getRecentLogs(7);
      const pattern = getHourlyPattern(recentLogs);
      setPaceInfo(getPaceStatus(currentLogs, pattern));
    } catch { /* ignore */ }
  }, []);

  // ── SW → LOG_DRINK message ─────────────────────────────────────────────────
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === 'LOG_DRINK') handleTap();
    }
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // ── Tap ────────────────────────────────────────────────────────────────────
  const handleTap = useCallback(
    async (e?: React.PointerEvent<HTMLButtonElement>) => {
      if (!settings) return;

      // Capture pointer coords BEFORE any await – React nullifies
      // synthetic-event properties (currentTarget) once the handler yields.
      let floatCoords: { x: number; y: number } | null = null;
      if (e) {
        const area = (e.currentTarget as HTMLElement)?.closest('[data-tap-area]');
        const rect = area?.getBoundingClientRect();
        floatCoords = {
          x: e.clientX - (rect?.left ?? 0),
          y: e.clientY - (rect?.top ?? 0),
        };
      }

      const rid = await logDrink(AMOUNT_PER_TAP);
      const newLog: DrinkLog = { id: rid as number, timestamp: Date.now(), amount: AMOUNT_PER_TAP };
      recordActivity();

      setLogs((prev) => {
        const next = [...prev, newLog];
        const total = next.reduce((a, d) => a + d.amount, 0);
        if (total >= settings.dailyGoal) setGoalHit(true);
        updatePace(next);
        return next;
      });

      // Update daily stats
      await upsertDailyStats(settings.dailyGoal);

      // Trigger AI message refresh
      setRefreshKey((k) => k + 1);

      if (floatCoords) {
        const did = ++dropIdRef.current;
        setFloats((f) => [...f, { id: did, ...floatCoords! }]);
        setTimeout(() => setFloats((f) => f.filter((d) => d.id !== did)), 950);
      }
    },
    [settings, recordActivity, updatePace]
  );

  // ── NLP Log ────────────────────────────────────────────────────────────────
  const handleNlpLog = useCallback(
    async (amount: number) => {
      if (!settings) return;

      const rid = await logDrink(amount);
      const newLog: DrinkLog = { id: rid as number, timestamp: Date.now(), amount };
      recordActivity();

      setLogs((prev) => {
        const next = [...prev, newLog];
        const total = next.reduce((a, d) => a + d.amount, 0);
        if (total >= settings.dailyGoal) setGoalHit(true);
        updatePace(next);
        return next;
      });

      await upsertDailyStats(settings.dailyGoal);
      setRefreshKey((k) => k + 1);
    },
    [settings, recordActivity, updatePace]
  );

  // ── Undo ───────────────────────────────────────────────────────────────────
  async function handleUndo() {
    if (!settings || logs.length === 0) return;
    const removed = await undoLastDrink();
    if (!removed) return;
    setLogs((prev) => {
      const next = prev.filter((l) => l.id !== removed.id);
      const total = next.reduce((a, d) => a + d.amount, 0);
      setGoalHit(total >= settings.dailyGoal);
      updatePace(next);
      return next;
    });
    await upsertDailyStats(settings.dailyGoal);
    setRefreshKey((k) => k + 1);
    setUndoFlash(true);
    setTimeout(() => setUndoFlash(false), 1400);
  }

  // ── Settings save ──────────────────────────────────────────────────────────
  async function handleSave(patch: Partial<AppSettings>) {
    await saveSettings(patch);
    const next = await getSettings();
    setSettings(next);
    const str = await getStreak(next.dailyGoal);
    setStreak(str);
    await upsertDailyStats(next.dailyGoal);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const goal       = settings?.dailyGoal ?? 2000;
  const totalToday = logs.reduce((a, d) => a + d.amount, 0);
  const fillRatio  = Math.min(totalToday / goal, 1);
  const cups       = Math.floor(totalToday / AMOUNT_PER_TAP);
  const remaining  = Math.max(goal - totalToday, 0);

  const bgStyle = {
    background: `
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(14,165,233,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 90% 110%, rgba(20,184,166,0.12) 0%, transparent 55%),
      #0a0f1e
    `,
  };

  return (
    <main className="relative flex flex-col items-center min-h-dvh overflow-hidden" style={bgStyle}>

      {/* ── Top bar ── */}
      <header className="w-full max-w-sm flex items-center justify-between px-5 pt-10 pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Today</p>
          <h1 className="font-display text-2xl text-white/90 leading-tight">Tap &amp; Drink</h1>
        </div>

        <div className="flex items-center gap-2">
          <StreakBadge streak={streak} />

          {/* Insights toggle */}
          <button
            onClick={() => setInsightsOpen((v) => !v)}
            aria-label={insightsOpen ? 'Hide insights' : 'Show AI insights'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border
                        transition-all duration-200 active:scale-90
                        ${insightsOpen
                          ? 'bg-water-500/20 border-water-500/40 text-water-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
          >
            <span className="text-sm">✨</span>
          </button>

          {/* History toggle */}
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label={historyOpen ? 'Hide history' : 'Show history'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border
                        transition-all duration-200 active:scale-90
                        ${historyOpen
                          ? 'bg-water-500/20 border-water-500/40 text-water-400'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
            </svg>
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10
                       flex items-center justify-center
                       hover:bg-white/10 transition-colors active:scale-90"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Goal banner ── */}
      {goalHit && (
        <div className="mt-2 mx-5 w-full max-w-[calc(384px-2.5rem)] px-4 py-2 rounded-xl
                        bg-tide-500/10 border border-tide-500/25 text-center">
          <span className="shimmer-text font-semibold text-sm">🎉 Daily goal reached — great work!</span>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoFlash && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none
                        px-4 py-2 rounded-xl bg-white/10 border border-white/20
                        text-xs text-white/70 backdrop-blur-sm whitespace-nowrap">
          ↩ Last drink removed
        </div>
      )}

      {/* ── Tap zone ── */}
      <div
        data-tap-area
        className="relative flex flex-col items-center justify-center flex-1 w-full max-w-sm px-5"
      >
        <div className="relative flex items-center justify-center w-64 h-64">
          <ProgressArc value={fillRatio} size={256} strokeWidth={9} />
          {floats.map((f) => (
            <span key={f.id} className="drop-float"
                  style={{ left: f.x, top: f.y, transform: 'translate(-50%,-50%)' }}>
              💧
            </span>
          ))}
          <DrinkButton fillRatio={fillRatio} onTap={handleTap} />
        </div>

        {/* Stats */}
        <div className="mt-8 w-full grid grid-cols-3 gap-3">
          {[
            { label: 'Consumed', value: `${totalToday} ml` },
            { label: 'Glasses',  value: cups.toString() },
            { label: 'Left',     value: remaining > 0 ? `${remaining} ml` : '✓ Done' },
          ].map(({ label, value }) => (
            <div key={label}
                 className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl
                            bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                {label}
              </span>
              <span className="font-display text-lg text-white/90 leading-none">{value}</span>
            </div>
          ))}
        </div>

        {/* NLP Input */}
        <NlpLogInput onLog={handleNlpLog} />

        {/* Motivational Banner (replaces static tip text) */}
        <MotivationalBanner
          fillRatio={fillRatio}
          totalToday={totalToday}
          goal={goal}
          streak={streak}
          refreshKey={refreshKey}
        />

        <div className="mt-3 flex items-center gap-2 w-full">
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-xs text-white/40">{totalToday} / {goal} ml</span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>
      </div>

      {/* ── History drawer ── */}
      {historyOpen && <DrinkHistory logs={logs} onUndo={handleUndo} />}

      {/* ── AI Insights panel ── */}
      <InsightsDashboard
        open={insightsOpen}
        goal={goal}
        onClose={() => setInsightsOpen(false)}
      />

      {/* ── Settings panel ── */}
      {settings && (
        <SettingsPanel
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* ── AI Coach widget ── */}
      <AiCoach
        fillRatio={fillRatio}
        totalToday={totalToday}
        goal={goal}
        cups={cups}
        streak={streak}
        paceInfo={paceInfo}
        refreshKey={refreshKey}
      />

      {/* Bottom glow */}
      <div aria-hidden="true" className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none"
           style={{ background: 'linear-gradient(to top, rgba(14,165,233,0.04), transparent)' }} />
    </main>
  );
}
