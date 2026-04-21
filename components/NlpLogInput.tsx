'use client';

import { useState, useRef, useEffect } from 'react';
import { parseNaturalLanguage, type ParseResult } from '@/lib/ai/nlpParser';

interface Props {
  onLog: (amount: number) => void;
}

type InputState = 'idle' | 'confirming' | 'confirmed' | 'editing';

export default function NlpLogInput({ onLog }: Props) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [state, setState] = useState<InputState>('idle');
  const [editAmount, setEditAmount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = parseNaturalLanguage(input);
    setResult(parsed);

    if (parsed.confidence === 'high') {
      setState('confirming');
      // Auto-confirm after 2s for high confidence
      timerRef.current = setTimeout(() => {
        onLog(parsed.amount);
        showConfirmed();
      }, 2000);
    } else {
      setState('confirming');
    }
  }

  function showConfirmed() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('confirmed');
    setTimeout(() => {
      setState('idle');
      setInput('');
      setResult(null);
    }, 1500);
  }

  function handleConfirm() {
    if (!result) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    onLog(result.amount);
    showConfirmed();
  }

  function handleEdit() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('editing');
    setEditAmount(result?.amount.toString() ?? '250');
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(editAmount, 10);
    if (amount > 0 && amount <= 5000) {
      onLog(amount);
      showConfirmed();
    }
  }

  function handleCancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('idle');
    setInput('');
    setResult(null);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="w-full mt-4">
      {/* Input */}
      {state === 'idle' && (
        <form onSubmit={handleSubmit} className="relative">
          <div className="nlp-input-wrapper flex items-center gap-2 px-3 py-2.5 rounded-2xl
                          bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm
                          focus-within:border-water-500/30 focus-within:bg-white/[0.06]
                          focus-within:shadow-[0_0_20px_rgba(14,165,233,0.1)]
                          transition-all duration-300">
            <span className="sparkle-icon text-sm select-none">✨</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 'a glass of water' or '500ml'"
              className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/25
                         outline-none font-body"
            />
            {input && (
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider
                           bg-water-500/20 text-water-400 hover:bg-water-500/30
                           transition-all duration-200 active:scale-90"
              >
                Log
              </button>
            )}
          </div>
        </form>
      )}

      {/* Confirmation chip */}
      {state === 'confirming' && result && (
        <div className="nlp-confirm flex items-center gap-3 px-4 py-3 rounded-2xl
                        bg-water-500/[0.08] border border-water-500/20
                        animate-slide-up-fade">
          <div className="flex-1">
            <p className="text-sm text-white/80 font-medium">
              <span className="mr-1.5">💧</span>
              Got it — {result.amount} ml
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {result.interpreted}
              {result.confidence === 'high' && ' · auto-confirming...'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleConfirm}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider
                         bg-water-500/25 text-water-400 hover:bg-water-500/35
                         transition-all active:scale-90"
            >
              ✓ Yes
            </button>
            <button
              onClick={handleEdit}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider
                         bg-white/5 text-white/40 hover:bg-white/10
                         transition-all active:scale-90"
            >
              Edit
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1.5 rounded-lg text-[10px] text-white/30
                         hover:text-white/50 transition-all active:scale-90"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {state === 'editing' && (
        <form
          onSubmit={handleEditSubmit}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl
                     bg-white/[0.04] border border-water-500/20 animate-slide-up-fade"
        >
          <span className="text-sm text-white/50">Amount:</span>
          <input
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            min="50"
            max="5000"
            step="50"
            autoFocus
            className="w-20 bg-white/[0.06] text-sm text-white/80 px-2 py-1 rounded-lg
                       border border-white/10 outline-none focus:border-water-500/30
                       font-body text-center"
          />
          <span className="text-sm text-white/50">ml</span>
          <button
            type="submit"
            className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider
                       bg-water-500/25 text-water-400 hover:bg-water-500/35
                       transition-all active:scale-90"
          >
            Log
          </button>
          <button
            onClick={handleCancel}
            type="button"
            className="px-2 py-1.5 rounded-lg text-[10px] text-white/30
                       hover:text-white/50 transition-all"
          >
            ✕
          </button>
        </form>
      )}

      {/* Confirmed flash */}
      {state === 'confirmed' && result && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                        bg-tide-500/[0.08] border border-tide-500/20 animate-slide-up-fade">
          <span className="text-base">✅</span>
          <span className="text-sm text-tide-400/80 font-medium">
            Logged {result.amount} ml
          </span>
        </div>
      )}
    </div>
  );
}
