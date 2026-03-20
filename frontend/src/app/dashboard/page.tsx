'use client';

import { useState } from 'react';
import {
  Search, TrendingDown, TrendingUp, Filter, Sparkles,
  Globe, ExternalLink, MoreHorizontal, RefreshCw, ArrowUpRight,
  Zap, Eye
} from 'lucide-react';

const COMPETITOR_DATA = [
  {
    name: 'Apex Solutions',
    niche: 'SaaS',
    price: '$4,800',
    change: '+8%',
    trend: 'up',
    status: 'Active',
    threat: 'High',
    website: 'apex.io',
  },
  {
    name: 'NovaTech Corp',
    niche: 'SaaS',
    price: '$3,950',
    change: '-3%',
    trend: 'down',
    status: 'Active',
    threat: 'Medium',
    website: 'novatech.com',
  },
  {
    name: 'Stratify Ltd',
    niche: 'Consulting',
    price: '$5,200',
    change: '+12%',
    trend: 'up',
    status: 'Active',
    threat: 'High',
    website: 'stratify.co',
  },
  {
    name: 'BluePath Agency',
    niche: 'Marketing',
    price: '$2,100',
    change: '-1%',
    trend: 'neutral',
    status: 'Inactive',
    threat: 'Low',
    website: 'bluepath.agency',
  },
];

const KPI_CARDS = [
  {
    label: 'Total Tracked',
    value: '12',
    chip: '+2 this week',
    chipColor: 'emerald',
    icon: Eye,
    accent: 'from-emerald-500 to-teal-400',
  },
  {
    label: 'Avg Market Price',
    value: '$4,250',
    chip: '−5% vs you',
    chipColor: 'red',
    icon: TrendingDown,
    accent: 'from-slate-600 to-slate-500',
  },
  {
    label: 'AI Opportunities',
    value: '3',
    chip: 'Niches detected',
    chipColor: 'emerald',
    icon: Zap,
    accent: 'from-emerald-500 to-green-400',
    gradient: true,
  },
];

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = COMPETITOR_DATA.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.niche.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Market Insights
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            Real-time competitor analysis and AI-powered pricing strategy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search competitors…"
              className="w-64 rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-400 hover:text-white hover:border-slate-700 transition-all">
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3.5 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/15 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
              {/* Accent top bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.accent} opacity-70`} />
              {/* Subtle hover glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800/0 to-slate-900/0 group-hover:from-slate-800/20 transition-all duration-300 rounded-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                  <p className={`mt-3 text-4xl font-bold tracking-tight ${card.gradient ? 'gradient-text' : 'text-white'}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.chipColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border
                ${card.chipColor === 'emerald'
                  ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/8 text-red-400 border-red-500/20'
                }`}>
                {card.chipColor === 'emerald'
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />
                }
                {card.chip}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Insight Banner */}
      <div className="relative rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-emerald-500/5 to-transparent" />
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-500/15 p-2.5 ring-1 ring-emerald-500/25 shrink-0">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-300">AI Pricing Recommendation</p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Based on competitor analysis, your pricing is{' '}
              <span className="text-emerald-400 font-semibold">5% below market average</span>. 
              {' '}Raising prices by <span className="text-white font-semibold">$250</span> could increase monthly revenue by ~$3,000 with minimal churn risk.
            </p>
          </div>
          <button className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all">
            Apply <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Competitor Table */}
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="border-b border-slate-800/60 px-6 py-4 flex items-center justify-between bg-slate-900/80">
          <h2 className="text-sm font-semibold text-white">Competitor Landscape</h2>
          <button className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors">
            Export <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-950/40">
                  {['Competitor', 'Niche', 'Avg Price', 'Change', 'Threat', 'Status', ''].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((c) => (
                  <tr key={c.name} className="group hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center ring-1 ring-slate-700/60">
                          <Globe className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.website}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-700/50">
                        {c.niche}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">{c.price}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-sm font-semibold
                        ${c.trend === 'up' ? 'text-emerald-400' : c.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                        {c.trend === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : c.trend === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                        {c.change}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold border
                        ${c.threat === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          c.threat === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-slate-700/50 text-slate-400 border-slate-700'}`}>
                        {c.threat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold
                        ${c.status === 'Active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        {c.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="rounded-lg p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 p-8">
            <div className="rounded-2xl bg-slate-800/50 p-5 mb-4">
              <Search className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-300">
              {search ? 'No matching competitors' : 'No competitors tracked yet'}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5 text-center max-w-xs">
              {search
                ? 'Try a different search term'
                : 'Run a web scrape to auto-discover and analyze your market.'}
            </p>
            {!search && (
              <button className="mt-5 rounded-xl bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all">
                Run Initial Scrape
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
