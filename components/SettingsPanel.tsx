'use client';

import { useEffect, useState } from 'react';
import type { AppSettings } from '@/lib/db';

interface Props {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (patch: Partial<AppSettings>) => void;
}

const GOAL_OPTIONS  = [1500, 2000, 2500, 3000, 3500];
const INTERVAL_OPTS = [30, 45, 60, 90, 120];

export default function SettingsPanel({ open, settings, onClose, onSave }: Props) {
  const [goal, setGoal]         = useState(settings.dailyGoal);
  const [interval, setInterval] = useState(settings.reminderInterval);

  // Sync when parent settings change
  useEffect(() => {
    setGoal(settings.dailyGoal);
    setInterval(settings.reminderInterval);
  }, [settings]);

  function save() {
    onSave({ dailyGoal: goal, reminderInterval: interval });
    onClose();
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
                    px-6 pt-5 pb-10 shadow-2xl ${open ? 'open' : 'closed'}`}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

        <h2 className="font-display text-xl text-white/90 mb-6">Settings</h2>

        {/* Daily goal */}
        <fieldset className="mb-7">
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

        {/* Reminder interval */}
        <fieldset className="mb-8">
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
