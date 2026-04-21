'use client';

import { useState } from 'react';
import { recommendGoal } from '@/lib/ai/hydrationEngine';
import { saveUserProfile, type UserProfile } from '@/lib/db';

interface Props {
  onApply: (goalMl: number) => void;
  onClose: () => void;
}

type Step = 'weight' | 'activity' | 'climate' | 'result';

const ACTIVITY_OPTIONS: { value: UserProfile['activityLevel']; label: string; icon: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sedentary',    icon: '🪑', desc: 'Mostly sitting, desk work' },
  { value: 'moderate',    label: 'Moderate',      icon: '🚶', desc: 'Some walking, light exercise' },
  { value: 'active',      label: 'Active',        icon: '🏃', desc: 'Regular workouts, on your feet' },
  { value: 'very_active', label: 'Very active',   icon: '🏋️', desc: 'Intense training, manual labor' },
];

const CLIMATE_OPTIONS: { value: UserProfile['climate']; label: string; icon: string; desc: string }[] = [
  { value: 'cold',       label: 'Cold',       icon: '❄️', desc: 'Below 10°C / 50°F' },
  { value: 'temperate',  label: 'Temperate',  icon: '🌤️', desc: '10-25°C / 50-77°F' },
  { value: 'hot',        label: 'Hot',        icon: '☀️', desc: '25-35°C / 77-95°F' },
  { value: 'tropical',   label: 'Tropical',   icon: '🌴', desc: 'Above 35°C / 95°F, humid' },
];

export default function GoalRecommender({ onApply, onClose }: Props) {
  const [step, setStep] = useState<Step>('weight');
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState<UserProfile['activityLevel']>('moderate');
  const [climate, setClimate] = useState<UserProfile['climate']>('temperate');

  const profile: UserProfile = {
    weight,
    activityLevel: activity,
    climate,
    createdAt: Date.now(),
  };

  const recommended = recommendGoal(profile);

  async function handleApply() {
    await saveUserProfile({ weight, activityLevel: activity, climate });
    onApply(recommended);
  }

  return (
    <div className="animate-slide-up-fade">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {(['weight', 'activity', 'climate', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300
                          ${step === s
                  ? 'bg-water-500 shadow-[0_0_8px_rgba(14,165,233,0.5)] scale-125'
                  : i < ['weight', 'activity', 'climate', 'result'].indexOf(step)
                    ? 'bg-water-500/50'
                    : 'bg-white/15'}`}
            />
            {i < 3 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step: Weight */}
      {step === 'weight' && (
        <div className="goal-step">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚖️</span>
            <p className="text-sm text-white/70 font-medium">What&apos;s your weight?</p>
          </div>
          <p className="text-[10px] text-white/30 mb-5">This helps calculate your ideal daily intake</p>

          <div className="flex flex-col items-center gap-4 mb-6">
            <span className="font-display text-4xl text-white/90">{weight} <span className="text-lg text-white/40">kg</span></span>
            <input
              type="range"
              min="30"
              max="180"
              step="1"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value, 10))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-water-500
                         [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:bg-water-500
                         [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(14,165,233,0.5)]
                         [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between w-full text-[10px] text-white/20">
              <span>30 kg</span>
              <span>180 kg</span>
            </div>
          </div>

          <button
            onClick={() => setStep('activity')}
            className="w-full py-3 rounded-2xl font-semibold text-white text-sm
                       bg-gradient-to-r from-water-600 to-water-500
                       hover:from-water-500 hover:to-tide-500
                       shadow-[0_4px_20px_rgba(14,165,233,0.3)]
                       transition-all duration-300 active:scale-95"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step: Activity */}
      {step === 'activity' && (
        <div className="goal-step animate-slide-up-fade">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏃</span>
            <p className="text-sm text-white/70 font-medium">How active are you?</p>
          </div>
          <p className="text-[10px] text-white/30 mb-5">Active people need more water</p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActivity(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border
                            transition-all duration-200 active:scale-95
                            ${activity === opt.value
                    ? 'bg-water-500/15 border-water-500/40 shadow-[0_0_12px_rgba(14,165,233,0.2)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'}`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className={`text-xs font-medium ${activity === opt.value ? 'text-water-400' : 'text-white/60'}`}>
                  {opt.label}
                </span>
                <span className="text-[9px] text-white/30 text-center leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('weight')}
              className="px-4 py-3 rounded-2xl text-sm text-white/40 bg-white/5
                         hover:bg-white/10 transition-all active:scale-95"
            >
              ←
            </button>
            <button
              onClick={() => setStep('climate')}
              className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm
                         bg-gradient-to-r from-water-600 to-water-500
                         hover:from-water-500 hover:to-tide-500
                         shadow-[0_4px_20px_rgba(14,165,233,0.3)]
                         transition-all duration-300 active:scale-95"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: Climate */}
      {step === 'climate' && (
        <div className="goal-step animate-slide-up-fade">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌡️</span>
            <p className="text-sm text-white/70 font-medium">What&apos;s your climate like?</p>
          </div>
          <p className="text-[10px] text-white/30 mb-5">Hotter climates mean more water loss</p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {CLIMATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setClimate(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border
                            transition-all duration-200 active:scale-95
                            ${climate === opt.value
                    ? 'bg-water-500/15 border-water-500/40 shadow-[0_0_12px_rgba(14,165,233,0.2)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'}`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className={`text-xs font-medium ${climate === opt.value ? 'text-water-400' : 'text-white/60'}`}>
                  {opt.label}
                </span>
                <span className="text-[9px] text-white/30 text-center leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('activity')}
              className="px-4 py-3 rounded-2xl text-sm text-white/40 bg-white/5
                         hover:bg-white/10 transition-all active:scale-95"
            >
              ←
            </button>
            <button
              onClick={() => setStep('result')}
              className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm
                         bg-gradient-to-r from-water-600 to-water-500
                         hover:from-water-500 hover:to-tide-500
                         shadow-[0_4px_20px_rgba(14,165,233,0.3)]
                         transition-all duration-300 active:scale-95"
            >
              See recommendation →
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && (
        <div className="goal-step animate-slide-up-fade">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
                            bg-gradient-to-br from-water-500/20 to-tide-500/20
                            border border-water-500/20
                            shadow-[0_0_30px_rgba(14,165,233,0.15)]">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-water-400/70 mb-2">
              AI Recommendation
            </p>
            <p className="font-display text-4xl text-white/90 mb-1">
              {recommended >= 1000 ? `${(recommended / 1000).toFixed(1)} L` : `${recommended} ml`}
            </p>
            <p className="text-xs text-white/40">per day</p>
          </div>

          <div className="space-y-1.5 mb-6 px-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Weight</span>
              <span className="text-white/60">{weight} kg</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Activity</span>
              <span className="text-white/60">{ACTIVITY_OPTIONS.find(a => a.value === activity)?.label}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Climate</span>
              <span className="text-white/60">{CLIMATE_OPTIONS.find(c => c.value === climate)?.label}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('climate')}
              className="px-4 py-3 rounded-2xl text-sm text-white/40 bg-white/5
                         hover:bg-white/10 transition-all active:scale-95"
            >
              ←
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm
                         bg-gradient-to-r from-water-600 to-tide-500
                         hover:from-water-500 hover:to-tide-400
                         shadow-[0_4px_20px_rgba(14,165,233,0.3)]
                         transition-all duration-300 active:scale-95"
            >
              ✨ Apply this goal
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Keep my current goal
          </button>
        </div>
      )}
    </div>
  );
}
