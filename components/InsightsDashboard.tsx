'use client';

import { useEffect, useState } from 'react';
import {
  getHourlyPattern,
  getWeeklyInsights,
  getWeeklyScore,
  type HourlyBucket,
  type WeeklyInsight,
  type WeeklyScore as WeeklyScoreType,
} from '@/lib/ai/hydrationEngine';
import { getRecentLogs, getRecentStats, type DrinkLog, type DailyStats } from '@/lib/db';

interface Props {
  open: boolean;
  goal: number;
  onClose: () => void;
}

export default function InsightsDashboard({ open, goal, onClose }: Props) {
  const [hourlyPattern, setHourlyPattern] = useState<HourlyBucket[]>([]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [weeklyScore, setWeeklyScore] = useState<WeeklyScoreType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    async function load() {
      const [logs, stats] = await Promise.all([
        getRecentLogs(7),
        getRecentStats(7),
      ]);

      setHourlyPattern(getHourlyPattern(logs));
      setInsights(getWeeklyInsights(logs, stats, goal));
      setWeeklyScore(getWeeklyScore(stats, goal));
      setLoading(false);
    }

    load();
  }, [open, goal]);

  const maxHourlyMl = Math.max(...hourlyPattern.map((b) => b.avgMl), 1);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI Insights"
        className={`settings-panel fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto
                    rounded-t-3xl bg-[#0d1829] border border-[rgba(14,165,233,0.15)]
                    px-6 pt-5 pb-10 shadow-2xl overflow-y-auto max-h-[85vh]
                    ${open ? 'open' : 'closed'}`}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-water-500 to-tide-500
                          flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.3)]">
            <span className="text-xs">✨</span>
          </div>
          <h2 className="font-display text-xl text-white/90">AI Insights</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Last 7 days
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-water-500/30 border-t-water-500
                            rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Weekly Score */}
            {weeklyScore && (
              <div className="flex items-center gap-5 mb-7 p-4 rounded-2xl
                              bg-white/[0.03] border border-white/[0.06]">
                {/* Circular gauge */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="rgba(14,165,233,0.1)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40" cy="40" r="34"
                      fill="none"
                      stroke="url(#scoreGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - weeklyScore.score / 100)}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center
                                   font-display text-xl text-white/90">
                    {weeklyScore.score}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-water-400/70 mb-1">
                    Hydration Score
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {weeklyScore.score >= 80
                      ? 'Excellent — you\'re a hydration pro!'
                      : weeklyScore.score >= 60
                        ? 'Good rhythm — room to improve'
                        : weeklyScore.score >= 30
                          ? 'Building up — stay consistent'
                          : 'Just getting started — keep going!'}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {weeklyScore.goalHitDays}/{weeklyScore.totalDays} days goal met · avg {weeklyScore.avgDailyMl} ml
                  </p>
                </div>
              </div>
            )}

            {/* Hourly Pattern Chart */}
            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-water-400/70 mb-3">
                Your Drinking Pattern
              </p>
              <div className="flex items-end gap-[3px] h-20 p-3 rounded-2xl
                              bg-white/[0.03] border border-white/[0.06]">
                {hourlyPattern
                  .filter((b) => b.hour >= 6 && b.hour <= 23)
                  .map((bucket) => {
                    const heightPct = maxHourlyMl > 0
                      ? (bucket.avgMl / maxHourlyMl) * 100
                      : 0;
                    const isActive = bucket.avgMl > 0;
                    return (
                      <div
                        key={bucket.hour}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${bucket.hour}:00 — avg ${bucket.avgMl} ml`}
                      >
                        <div
                          className={`w-full rounded-sm transition-all duration-700 ease-out
                                      ${isActive
                              ? 'bg-gradient-to-t from-water-600 to-water-400'
                              : 'bg-white/[0.05]'}`}
                          style={{
                            height: `${Math.max(heightPct, 4)}%`,
                            animationDelay: `${(bucket.hour - 6) * 50}ms`,
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
              <div className="flex justify-between mt-1.5 px-3">
                <span className="text-[9px] text-white/20">6 AM</span>
                <span className="text-[9px] text-white/20">12 PM</span>
                <span className="text-[9px] text-white/20">6 PM</span>
                <span className="text-[9px] text-white/20">11 PM</span>
              </div>
            </div>

            {/* AI Observations */}
            {insights.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-water-400/70 mb-3">
                  AI Observations
                </p>
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl
                                 bg-white/[0.03] border border-white/[0.06]
                                 animate-slide-up-fade"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <span className="text-base mt-0.5 select-none">{insight.emoji}</span>
                      <p className="text-sm text-white/60 leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {insights.length === 0 && (!weeklyScore || weeklyScore.totalDays === 0) && (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-sm text-white/40">
                  Keep logging for a few days —<br />AI insights will appear here
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
