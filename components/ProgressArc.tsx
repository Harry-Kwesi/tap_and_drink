'use client';

interface Props {
  value: number;    // 0-1
  size?: number;
  strokeWidth?: number;
}

export default function ProgressArc({ value, size = 260, strokeWidth = 10 }: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(value, 1));

  // Colour shifts: sky blue → teal when ≥100%
  const isComplete = value >= 1;
  const stroke = isComplete
    ? 'url(#arcComplete)'
    : 'url(#arcNormal)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arcNormal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="arcComplete" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle
        cx={cx} cy={cx} r={r}
        className="progress-arc-track"
        strokeWidth={strokeWidth}
      />

      {/* Fill */}
      <circle
        cx={cx} cy={cx} r={r}
        className="progress-arc-fill"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        filter="url(#glow)"
      />
    </svg>
  );
}
