'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, LineChart, Settings, Spade, LogOut,
  Bell, ChevronDown, User
} from 'lucide-react';

const NAV_ITEMS = [
  {
    group: 'Core Tools',
    items: [
      { href: '/dashboard', label: 'Market Insights', icon: LayoutDashboard },
      { href: '/dashboard/profit', label: 'Profit Manager', icon: LineChart },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 border-r border-slate-800/60 relative z-20">
        
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        {/* Brand */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/60">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-emerald-500/20 blur-md" />
            <div className="relative rounded-lg bg-gradient-to-br from-emerald-500/25 to-emerald-600/5 p-2.5 ring-1 ring-emerald-500/30">
              <Spade className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white">Spade & Scale</span>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Intelligence Suite</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
          {NAV_ITEMS.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      <div className={`rounded-lg p-1.5 transition-colors ${active ? 'bg-emerald-500/15' : 'bg-slate-800/50'}`}>
                        <Icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                      </div>
                      <span className="text-sm">{label}</span>
                      {active && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-800/60 space-y-0.5">
          <button className="nav-link w-full text-left">
            <div className="rounded-lg bg-slate-800/50 p-1.5">
              <Bell className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm">Notifications</span>
            <span className="ml-auto rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5">3</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-slate-700 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <User className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">My Business</p>
              <p className="text-[10px] text-slate-500 truncate">user@company.com</p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-600 shrink-0" />
          </div>

          <button className="nav-link w-full text-left hover:!bg-red-500/8 hover:!text-red-400 hover:!border-red-500/15">
            <div className="rounded-lg bg-slate-800/50 p-1.5">
              <LogOut className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <Spade className="h-5 w-5 text-emerald-400" />
            <span className="text-base font-bold tracking-tight text-white">Spade & Scale</span>
          </div>
          <button className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400">
            <Bell className="h-4 w-4" />
          </button>
        </header>

        {/* Desktop top header bar */}
        <div className="hidden md:flex h-14 items-center justify-end gap-3 px-6 border-b border-slate-800/40 bg-slate-900/30 backdrop-blur-md">
          <button className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-400 hover:text-white hover:border-slate-700 transition-all">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-slate-950" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto animated-bg">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
