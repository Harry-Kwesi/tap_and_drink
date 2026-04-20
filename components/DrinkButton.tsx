'use client';

import { useRef } from 'react';

interface Props {
  fillRatio: number;  // 0-1
  onTap: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

export default function DrinkButton({ fillRatio, onTap }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Ripple
    const btn = btnRef.current!;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);

    const circle = document.createElement('span');
    circle.className = 'ripple-circle';
    circle.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${x - size / 2}px; top: ${y - size / 2}px;
    `;
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 700);

    onTap(e);
  }

  const clampedFill = Math.min(Math.max(fillRatio, 0), 1);
  const fillPercent = clampedFill * 100;

  // Water colour interpolates sky→teal as you fill up
  const waterColor = fillRatio >= 1 ? '#14b8a6' : '#0ea5e9';

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      className="ripple-origin relative w-36 h-48 cursor-pointer select-none
                 focus:outline-none focus-visible:ring-4 focus-visible:ring-water-400/50
                 rounded-[2rem] active:scale-95 transition-transform duration-150"
      aria-label="Log 250 ml of water"
    >
      {/* Bottle outline */}
      <svg
        viewBox="0 0 120 180"
        className="absolute inset-0 w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="bottleClip">
            {/* Neck */}
            <rect x="42" y="8" width="36" height="28" rx="6" />
            {/* Body */}
            <path d="M20 44 Q16 56 16 72 L16 150 Q16 164 30 164 L90 164 Q104 164 104 150 L104 72 Q104 56 100 44 Z" />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={waterColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(148,219,255,0.18)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.06)" />
          </linearGradient>
        </defs>

        {/* Glass body */}
        <rect x="42" y="8" width="36" height="28" rx="6"
          fill="url(#bottleGrad)"
          stroke="rgba(148,219,255,0.35)" strokeWidth="1.5" />
        <path d="M20 44 Q16 56 16 72 L16 150 Q16 164 30 164 L90 164 Q104 164 104 150 L104 72 Q104 56 100 44 Z"
          fill="url(#bottleGrad)"
          stroke="rgba(148,219,255,0.35)" strokeWidth="1.5" />

        {/* Water fill (clipped) */}
        <g clipPath="url(#bottleClip)">
          {/* Solid water block rising from bottom */}
          <rect
            x="0" y="0"
            width="120"
            height="180"
            fill="url(#waterGrad)"
            className="bottle-fill"
            style={{
              transform: `scaleY(${clampedFill})`,
              transformOrigin: 'bottom',
            }}
          />
          {/* Wave on top of water */}
          {clampedFill > 0 && clampedFill < 1 && (
            <g
              style={{
                transform: `translateY(${180 - clampedFill * 180 - 8}px)`,
              }}
            >
              <svg width="180" height="16" viewBox="0 0 180 16" className="wave-svg">
                <path
                  d="M0 8 Q22 0 45 8 Q67 16 90 8 Q112 0 135 8 Q157 16 180 8 L180 16 L0 16 Z"
                  fill={waterColor}
                  opacity="0.85"
                />
              </svg>
            </g>
          )}
        </g>

        {/* Glass shine */}
        <path d="M30 56 Q28 90 30 130" stroke="rgba(255,255,255,0.18)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M38 52 Q37 70 38 88"  stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Cap */}
        <rect x="44" y="2" width="32" height="12" rx="5"
          fill="rgba(148,219,255,0.25)"
          stroke="rgba(148,219,255,0.5)" strokeWidth="1.5" />
      </svg>

      {/* Percentage label inside bottle */}
      <span
        className="absolute inset-0 flex items-end justify-center pb-7
                   text-sm font-body font-semibold text-white/80 select-none"
        aria-hidden="true"
      >
        {Math.round(fillPercent)}%
      </span>
    </button>
  );
}
