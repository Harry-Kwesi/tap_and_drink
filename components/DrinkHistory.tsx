'use client';

import { type DrinkLog } from '@/lib/db';

interface Props {
  logs: DrinkLog[];
  onUndo: () => void;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DrinkHistory({ logs, onUndo }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-center text-xs text-white/25 py-6 select-none">
        No drinks logged yet — tap the bottle!
      </p>
    );
  }

  // Show most-recent first, cap at 8 rows
  const visible = [...logs].reverse().slice(0, 8);

  return (
    <div className="w-full max-w-sm px-5 pb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Today's log
        </span>
        <button
          onClick={onUndo}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 text-xs text-water-400/70
                     hover:text-water-400 disabled:opacity-30 transition-colors
                     active:scale-90"
          aria-label="Undo last drink"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
          </svg>
          Undo
        </button>
      </div>

      <ul className="space-y-1.5" role="list" aria-label="Today's drinks">
        {visible.map((log, i) => (
          <li
            key={log.id ?? i}
            className="flex items-center gap-3 px-3 py-2 rounded-xl
                       bg-white/[0.035] border border-white/[0.06]
                       transition-all duration-300"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="text-base select-none" aria-hidden="true">💧</span>
            <span className="flex-1 text-sm text-white/70 font-body">
              {log.amount} ml
            </span>
            <span className="text-xs text-white/30 tabular-nums">
              {fmtTime(log.timestamp)}
            </span>
          </li>
        ))}
      </ul>

      {logs.length > 8 && (
        <p className="text-center text-[10px] text-white/25 mt-2">
          +{logs.length - 8} earlier
        </p>
      )}
    </div>
  );
}
