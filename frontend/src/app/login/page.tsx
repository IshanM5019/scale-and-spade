'use client';

import { useState, useTransition } from 'react';
import { Mail, Lock, Spade, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { login, signup } from './actions';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (mode === 'login') {
        await login(formData);
      } else {
        await signup(formData);
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-slate-700/20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/4 blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md">
        {/* Outer glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 via-slate-700/10 to-transparent" />
        
        <div className="relative rounded-2xl bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl border border-slate-800/60">
          
          {/* Logo & Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 relative">
              <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-lg scale-150" />
              <div className="relative rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 p-3.5 ring-1 ring-emerald-500/30">
                <Spade className="h-7 w-7 text-emerald-400" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xs">
              {mode === 'login'
                ? 'Sign in to your Spade & Scale dashboard'
                : 'Create your account and start scaling profitably'}
            </p>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="input-field pl-11 text-sm"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="password">
                  Password
                </label>
                {mode === 'login' && (
                  <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input-field pl-11 pr-11 text-sm"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink-0 px-4 text-xs text-slate-600 uppercase tracking-wider font-semibold">
              {mode === 'login' ? 'New to Spade?' : 'Already have an account?'}
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
            className="btn-outline text-sm"
          >
            {mode === 'login' ? 'Create a free account' : 'Sign in instead'}
          </button>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              SOC 2 ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
