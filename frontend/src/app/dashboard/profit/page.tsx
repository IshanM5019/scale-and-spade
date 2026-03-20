'use client';

import { useState } from 'react';
import {
  TrendingUp, DollarSign, Target, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Edit3, CheckCircle2, AlertCircle, BarChart3, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const MONTHLY_DATA = [
  { month: 'Oct', revenue: 18400, expenses: 12200, profit: 6200 },
  { month: 'Nov', revenue: 21000, expenses: 13500, profit: 7500 },
  { month: 'Dec', revenue: 25800, expenses: 14200, profit: 11600 },
  { month: 'Jan', revenue: 22100, expenses: 13800, profit: 8300 },
  { month: 'Feb', revenue: 27300, expenses: 15000, profit: 12300 },
  { month: 'Mar', revenue: 31500, expenses: 16200, profit: 15300 },
];

const REVENUE_STREAMS = [
  { name: 'Core Product', monthly: 18400, growth: '+12%', trend: 'up', share: 58 },
  { name: 'Consulting', monthly: 8200, growth: '+5%', trend: 'up', share: 26 },
  { name: 'Maintenance', monthly: 3800, growth: '-2%', trend: 'down', share: 12 },
  { name: 'Referrals', monthly: 1100, growth: '+3%', trend: 'up', share: 4 },
];

const KPI = [
  {
    label: 'Total Revenue',
    value: '$31,500',
    change: '+15.4%',
    up: true,
    icon: DollarSign,
    sub: 'vs last month',
  },
  {
    label: 'Net Profit',
    value: '$15,300',
    change: '+24.4%',
    up: true,
    icon: TrendingUp,
    sub: 'vs last month',
  },
  {
    label: 'Profit Margin',
    value: '48.6%',
    change: '+3.9pp',
    up: true,
    icon: BarChart3,
    sub: 'vs last month',
  },
  {
    label: 'Target Gap',
    value: '-$700',
    change: '95.4% there',
    up: false,
    icon: Target,
    sub: '→ $16,000 goal',
  },
];

type StreamType = {
  name: string;
  monthly: number;
  growth: string;
  trend: string;
  share: number;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-slate-800/95 border border-slate-700/60 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-slate-200 mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-slate-300 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-semibold text-white">${p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ProfitManagerPage() {
  const [streams, setStreams] = useState<StreamType[]>(REVENUE_STREAMS);
  const [target, setTarget] = useState(16000);
  const [editingTarget, setEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState('16000');
  const currentProfit = 15300;
  const progress = Math.min((currentProfit / target) * 100, 100);

  const deleteStream = (name: string) => {
    setStreams(prev => prev.filter(s => s.name !== name));
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Profit Manager
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            Track revenue streams, monitor margins, and hit your profit targets.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5">
          <Calendar className="h-3.5 w-3.5" />
          March 2026
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 hover:border-slate-700/80 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
                <div className={`rounded-lg p-1.5 ${k.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{k.value}</p>
              <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${k.up ? 'text-emerald-400' : 'text-amber-400'}`}>
                {k.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                <span>{k.change}</span>
                <span className="text-slate-600 font-normal ml-1">{k.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profit Target Progress */}
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/20">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Profit Target</h3>
              <p className="text-xs text-slate-500 mt-0.5">Set during onboarding · adjustable</p>
            </div>
          </div>

          {editingTarget ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  className="w-32 rounded-lg border border-slate-700 bg-slate-800 pl-7 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { setTarget(Number(newTarget)); setEditingTarget(false); }}
                className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTarget(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTarget(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-700/50 rounded-lg px-3 py-1.5 transition-all hover:border-slate-600"
            >
              <Edit3 className="h-3 w-3" /> Edit target
            </button>
          )}
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold text-white">${currentProfit.toLocaleString()}</span>
            <span className="text-slate-500 text-sm ml-2">of ${target.toLocaleString()}</span>
          </div>
          <span className={`text-sm font-bold ${progress >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {progress.toFixed(1)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #10b981, #6ee7b7)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
            }}
          />
        </div>

        {progress >= 100 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Target achieved! Time to level up.
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            ${(target - currentProfit).toLocaleString()} more to hit target this month
          </p>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Trend */}
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Profit Trend (6M)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(71,85,105,0.2)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Expenses */}
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Revenue vs Expenses (6M)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke="rgba(71,85,105,0.2)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" opacity={0.85} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#475569" opacity={0.7} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Streams */}
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden">
        <div className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between bg-slate-900/80">
          <h3 className="text-sm font-semibold text-white">Revenue Streams</h3>
          <button className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/18 transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Stream
          </button>
        </div>

        <div className="divide-y divide-slate-800/40">
          {streams.map((s) => (
            <div key={s.name} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/25 transition-colors group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <span className={`text-xs font-bold flex items-center gap-1 ${s.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {s.growth}
                  </span>
                </div>
                {/* Share bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500/70"
                      style={{ width: `${s.share}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 w-8 text-right">{s.share}%</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-white">${s.monthly.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">per month</p>
              </div>

              <button
                onClick={() => deleteStream(s.name)}
                className="ml-2 rounded-lg p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/8 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
