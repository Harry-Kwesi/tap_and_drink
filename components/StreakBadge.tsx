'use client';

interface Props {
  streak: number; // days
}

export default function StreakBadge({ streak }: Props) {
  if (streak === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full
                 bg-amber-500/10 border border-amber-400/20"
      title={`${streak}-day streak`}
    >
      <span className="text-sm" aria-hidden="true">🔥</span>
      <span className="text-xs font-semibold text-amber-300/80">
        {streak} day{streak !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
