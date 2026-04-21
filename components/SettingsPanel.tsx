'use client';

import { useEffect, useState } from 'react';
import type { AppSettings } from '@/lib/db';
import GoalRecommender from './GoalRecommender';

interface Props {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: Partial<AppSettings>) => void;
}

const GOAL_OPTIONS  = [1500, 2000, 2500, 3000, 3500];
const INTERVAL_OPTS = [30, 45, 60, 90, 120];

export default function SettingsPanel({ open, settings, onClose, onSave }: Props) {
  const [goal, setGoal]                 = useState(settings.dailyGoal);
  const [interval, setInterval]         = useState(settings.reminderInterval);
  const [smartReminders, setSmartReminders] = useState(settings.smartReminders ?? false);
  const [showAiGoal, setShowAiGoal]     = useState(false);

  // Sync when parent settings change
  useEffect(() => {
    setGoal(settings.dailyGoal);
    setInterval(settings.reminderInterval);
    setSmartReminders(settings.smartReminders ?? false);
  }, [settings]);

  function save() {
    onSave({ dailyGoal: goal, reminderInterval: interval, smartReminders });
    onClose();
  }

  function handleAiGoalApply(recommendedGoal: number) {
    setGoal(recommendedGoal);
    setShowAiGoal(false);
  }

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
        aria-label="Settings"
        className={`settings-panel fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto
                    rounded-t-3xl bg-[#0d1829] border border-[rgba(14,165,233,0.15)]
                    px-6 pt-5 pb-10 shadow-2xl overflow-y-auto max-h-[85vh]
                    ${open ? 'open' : 'closed'}`}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <h2 className="font-display text-xl text-white/90 mb-6">Settings</h2>

        {/* AI Goal Recommender */}
        {showAiGoal ? (
          <div className="mb-7">
            <GoalRecommender
              onApply={handleAiGoalApply}
              onClose={() => setShowAiGoal(false)}
            />
          </div>
        ) : (
          <>
            {/* Daily goal */}
            <fieldset className="mb-5">
              <legend className="text-xs font-semibold uppercase tracking-widest text-water-400 mb-3">
                Daily Goal
              </legend>
              <div className="flex gap-2 flex-wrap">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${goal === g
                        ? 'bg-water-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                      }`}
                  >
                    {g >= 1000 ? `${g / 1000} L` : `${g} ml`}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* AI Goal button */}
            <button
              onClick={() => setShowAiGoal(true)}
              className="w-full mb-7 py-2.5 rounded-xl text-xs font-medium
                         bg-gradient-to-r from-water-500/10 to-tide-500/10
                         border border-water-500/20 text-water-400/80
                         hover:from-water-500/15 hover:to-tide-500/15
                         hover:text-water-400
                         transition-all duration-300 active:scale-[0.98]
                         flex items-center justify-center gap-2"
            >
              <span className="sparkle-icon text-sm">✨</span>
              AI-powered goal recommendation
            </button>

            {/* Reminder interval */}
            <fieldset className="mb-5">
              <legend className="text-xs font-semibold uppercase tracking-widest text-water-400 mb-3">
                Remind every
              </legend>
              <div className="flex gap-2 flex-wrap">
                {INTERVAL_OPTS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setInterval(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${interval === m
                        ? 'bg-water-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                      }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Smart Reminders Toggle */}
            <div className="mb-8 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="sparkle-icon text-sm">🧠</span>
                <div>
                  <p className="text-sm text-white/70 font-medium">Smart Reminders</p>
                  <p className="text-[10px] text-white/30">AI learns your drinking rhythm</p>
                </div>
              </div>
              <button
                onClick={() => setSmartReminders((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300
                            ${smartReminders
                              ? 'bg-water-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                              : 'bg-white/10'}`}
                role="switch"
                aria-checked={smartReminders}
                aria-label="Toggle smart reminders"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
                              shadow-sm transition-transform duration-300
                              ${smartReminders ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </>
        )}

        <button
          onClick={save}
          className="w-full py-3.5 rounded-2xl font-semibold text-white
                     bg-gradient-to-r from-water-600 to-water-500
                     hover:from-water-500 hover:to-tide-500
                     shadow-[0_4px_20px_rgba(14,165,233,0.3)]
                     transition-all duration-300 active:scale-95"
        >
          Save changes
        </button>
      </div>
    </>
  );
}
