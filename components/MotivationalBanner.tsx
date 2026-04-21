'use client';

import { useEffect, useState, useRef } from 'react';
import { getBannerMessage, type CoachMessage } from '@/lib/ai/messageEngine';

interface Props {
  fillRatio: number;
  totalToday: number;
  goal: number;
  streak: number;
  refreshKey: number;  // increment to trigger new message
}

export default function MotivationalBanner({ fillRatio, totalToday, goal, streak, refreshKey }: Props) {
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const [visible, setVisible] = useState(true);
  const prevKeyRef = useRef(refreshKey);

  useEffect(() => {
    const msg = getBannerMessage(fillRatio, totalToday, goal, streak);
    setMessage(msg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (refreshKey !== prevKeyRef.current) {
      prevKeyRef.current = refreshKey;
      // Crossfade: fade out → swap → fade in
      setVisible(false);
      const timer = setTimeout(() => {
        const msg = getBannerMessage(fillRatio, totalToday, goal, streak);
        setMessage(msg);
        setVisible(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [refreshKey, fillRatio, totalToday, goal, streak]);

  if (!message) return null;

  return (
    <p
      className={`mt-5 text-xs tracking-wide text-center transition-all duration-400
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="sparkle-icon text-sm">{message.emoji}</span>
        <span className="text-white/45">{message.text}</span>
      </span>
    </p>
  );
}
