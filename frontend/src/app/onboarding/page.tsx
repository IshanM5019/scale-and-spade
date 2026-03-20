'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Target, TrendingUp, ArrowRight, ArrowLeft,
  CheckCircle2, Spade, Utensils, Rocket, ShoppingBag, Stethoscope,
  GraduationCap, Laptop, Home, Dumbbell, ChevronRight
} from 'lucide-react';

const NICHES = [
  { label: 'Restaurant', icon: Utensils },
  { label: 'Startup', icon: Rocket },
  { label: 'Retail', icon: ShoppingBag },
  { label: 'Healthcare', icon: Stethoscope },
  { label: 'Education', icon: GraduationCap },
  { label: 'SaaS', icon: Laptop },
  { label: 'Real Estate', icon: Home },
  { label: 'Fitness', icon: Dumbbell },
];

const PROFIT_PRESETS = [
  { label: '$1k – $5k', value: '5000' },
  { label: '$5k – $15k', value: '15000' },
  { label: '$15k – $50k', value: '50000' },
  { label: '$50k+', value: '100000' },
];

const STEPS = [
  { label: 'Business', icon: Building2 },
  { label: 'Niche', icon: Target },
  { label: 'Profit', icon: TrendingUp },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    niche: '',
    targetProfit: '',
    customProfit: '',
  });

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  const canProceed = () => {
    if (step === 1) return formData.businessName.trim().length > 0;
    if (step === 2) return formData.niche.length > 0;
    if (step === 3) return formData.targetProfit.length > 0;
    return false;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Ambient effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/6 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-slate-700/15 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Outer border glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/15 via-slate-800/10 to-transparent" />

        <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-slate-800/60 overflow-hidden">
          
          {/* Top emerald accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600" />
          
          <div className="p-8">
            {/* Brand header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 ring-1 ring-emerald-500/25">
                  <Spade className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-slate-300 tracking-tight">Spade & Scale</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{step} of 3</span>
            </div>

            {/* Step progress */}
            <div className="mb-10">
              <div className="relative flex items-center justify-between">
                {/* Track line */}
                <div className="absolute left-5 right-5 top-5 h-0.5 bg-slate-800" />
                <div
                  className="absolute left-5 top-5 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                  style={{ width: `calc(${((step - 1) / 2) * 100}% - ${step < 3 ? '0px' : '0px'})`, maxWidth: 'calc(100% - 40px)' }}
                />
                {STEPS.map((s, i) => {
                  const isActive = step === i + 1;
                  const isDone = step > i + 1;
                  const StepIcon = s.icon;
                  return (
                    <div key={i} className="relative flex flex-col items-center gap-2 z-10">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 font-semibold text-sm transition-all duration-500
                        ${isDone ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                        ${isActive ? 'border-emerald-500 bg-slate-900 text-emerald-400' : ''}
                        ${!isActive && !isDone ? 'border-slate-700 bg-slate-900 text-slate-600' : ''}
                      `}
                        style={isActive ? { boxShadow: '0 0 16px rgba(16,185,129,0.4)' } : {}}
                      >
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                      </div>
                      <span className={`text-xs font-medium transition-colors ${isActive ? 'text-emerald-400' : isDone ? 'text-slate-400' : 'text-slate-600'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Business Name */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-white">What&apos;s your business called?</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    This is how we&apos;ll personalise your dashboard and reports.
                  </p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    autoFocus
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && canProceed() && handleNext()}
                    placeholder="e.g. Acme Corporation"
                    className="input-field py-4 text-lg"
                  />
                  {formData.businessName && (
                    <p className="text-xs text-emerald-400/80 ml-1 animate-in fade-in duration-300">
                      ✓ Great name! Let&apos;s continue.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Niche */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-white">Pick your market niche</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    We&apos;ll tailor your competitor analysis and pricing insights to your sector.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {NICHES.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFormData({ ...formData, niche: label })}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium text-left transition-all duration-200 active:scale-[0.98]
                        ${formData.niche === label
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/70'
                        }`}
                      style={formData.niche === label ? { boxShadow: '0 0 12px rgba(16,185,129,0.15)' } : {}}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    value={formData.niche && !NICHES.find(n => n.label === formData.niche) ? formData.niche : ''}
                    onChange={e => setFormData({ ...formData, niche: e.target.value })}
                    placeholder="Or type a custom niche…"
                    className="input-field text-sm py-3"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Target Profit */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-white">Set your profit target</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Your monthly profit goal helps us surface the most impactful opportunities.
                  </p>
                </div>
                
                {/* Preset chips */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {PROFIT_PRESETS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetProfit: value })}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]
                        ${formData.targetProfit === value
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                  <input
                    type="number"
                    value={formData.targetProfit}
                    onChange={e => setFormData({ ...formData, targetProfit: e.target.value })}
                    placeholder="Custom amount…"
                    className="input-field pl-9 text-lg py-4"
                  />
                </div>
                
                {formData.targetProfit && (
                  <div className="mt-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-4 flex items-center gap-3 animate-in fade-in duration-300">
                    <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-sm text-slate-300">
                      We&apos;ll track your progress toward{' '}
                      <span className="font-semibold text-emerald-400">
                        ${Number(formData.targetProfit).toLocaleString()}/mo
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1}
                className="flex items-center gap-2 rounded-xl border border-slate-700/60 px-5 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <button
                type="button"
                onClick={step === 3 ? handleComplete : handleNext}
                disabled={!canProceed()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-slate-950 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={canProceed() ? { boxShadow: '0 0 20px rgba(16,185,129,0.3)' } : {}}
              >
                {step === 3 ? (
                  <>Launch Dashboard <ChevronRight className="h-4 w-4" /></>
                ) : (
                  <>Continue <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
