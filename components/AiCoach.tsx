'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getCoachMessage, type CoachMessage } from '@/lib/ai/messageEngine';
import type { PaceInfo } from '@/lib/ai/hydrationEngine';

interface Props {
  fillRatio: number;
  totalToday: number;
  goal: number;
  cups: number;
  streak: number;
  paceInfo: PaceInfo;
  refreshKey: number;
}

export default function AiCoach({
  fillRatio,
  totalToday,
  goal,
  cups,
  streak,
  paceInfo,
  refreshKey,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevKeyRef = useRef(refreshKey);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const generateMessage = useCallback(() => {
    const msg = getCoachMessage(fillRatio, totalToday, goal, cups, streak, paceInfo);
    setMessage(msg);
    setHasNewMessage(true);

    // Typing reveal animation
    setDisplayText('');
    setIsTyping(true);
    const fullText = msg.text;
    let i = 0;

    const typeNext = () => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1));
        i++;
        typingTimerRef.current = setTimeout(typeNext, 20 + Math.random() * 15);
      } else {
        setIsTyping(false);
      }
    };
    typeNext();
  }, [fillRatio, totalToday, goal, cups, streak, paceInfo]);

  // Initial message
  useEffect(() => {
    generateMessage();
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // New message on drink
  useEffect(() => {
    if (refreshKey !== prevKeyRef.current) {
      prevKeyRef.current = refreshKey;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      generateMessage();
    }
  }, [refreshKey, generateMessage]);

  // Auto-rotate every 60s when expanded and idle
  useEffect(() => {
    if (!expanded) return;
    const interval = setInterval(() => {
      if (!isTyping) generateMessage();
    }, 60_000);
    return () => clearInterval(interval);
  }, [expanded, isTyping, generateMessage]);

  const priorityColor = message?.priority === 'celebration'
    ? 'from-amber-400/20 to-tide-400/20'
    : message?.priority === 'warning'
      ? 'from-orange-400/20 to-amber-400/20'
      : 'from-water-400/20 to-tide-400/20';

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3">
      {/* Expanded card */}
      {expanded && message && (
        <div
          className={`ai-coach-card w-[280px] rounded-2xl border border-white/10
                      bg-gradient-to-br ${priorityColor} backdrop-blur-xl
                      shadow-[0_8px_40px_rgba(14,165,233,0.15)] p-4
                      animate-slide-up-fade`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="ai-avatar w-7 h-7 rounded-full bg-gradient-to-br from-water-500 to-tide-500
                              flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.4)]">
                <span className="text-xs">✨</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                AI Coach
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center
                         text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
              aria-label="Collapse coach"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <div className="min-h-[48px]">
            <p className="text-sm text-white/80 leading-relaxed font-body">
              <span className="mr-1.5">{message.emoji}</span>
              {displayText}
              {isTyping && (
                <span className="inline-block w-[2px] h-[14px] bg-water-400 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>

          {/* Next tip button */}
          <button
            onClick={() => {
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              generateMessage();
            }}
            disabled={isTyping}
            className="mt-3 w-full py-2 rounded-xl text-[11px] font-medium uppercase tracking-wider
                       bg-white/[0.06] border border-white/[0.08] text-white/40
                       hover:bg-white/[0.1] hover:text-white/60
                       disabled:opacity-30 transition-all duration-200 active:scale-95"
          >
            Next insight →
          </button>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => {
          setExpanded((v) => !v);
          setHasNewMessage(false);
        }}
        className={`ai-coach-btn relative w-12 h-12 rounded-full
                    bg-gradient-to-br from-water-500 to-tide-500
                    shadow-[0_4px_20px_rgba(14,165,233,0.35)]
                    flex items-center justify-center
                    hover:shadow-[0_4px_30px_rgba(14,165,233,0.5)]
                    active:scale-90 transition-all duration-200
                    ${expanded ? 'ring-2 ring-water-400/30' : ''}`}
        aria-label={expanded ? 'Collapse AI coach' : 'Open AI coach'}
      >
        <span className="text-lg select-none">✨</span>

        {/* New message badge */}
        {hasNewMessage && !expanded && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full
                           bg-amber-400 border-2 border-ocean-900
                           animate-pulse" />
        )}
      </button>
    </div>
  );
}
