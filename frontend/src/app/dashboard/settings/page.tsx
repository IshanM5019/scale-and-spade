'use client';

import { useState } from 'react';
import {
  Settings, User, Bell, Shield, Palette, Globe,
  Save, ChevronRight, Mail, Building2, Spade, Check,
  Eye, EyeOff, Lock, Smartphone, Zap
} from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Zap },
];

const NOTIFICATION_SETTINGS = [
  { id: 'competitor_alerts', label: 'Competitor Price Alerts', desc: 'When a tracked competitor changes pricing by >5%', defaultOn: true },
  { id: 'weekly_digest', label: 'Weekly Market Digest', desc: 'Every Monday: competitor summary and AI insights', defaultOn: true },
  { id: 'profit_milestones', label: 'Profit Milestones', desc: 'When you hit 25%, 50%, 75%, 100% of your target', defaultOn: true },
  { id: 'ai_recommendations', label: 'AI Recommendations', desc: 'Real-time pricing and market opportunity suggestions', defaultOn: false },
  { id: 'new_competitors', label: 'New Market Entrants', desc: 'Alert when new competitors appear in your niche', defaultOn: false },
];

const INTEGRATIONS = [
  { name: 'Supabase', desc: 'Database & Auth backend', status: 'connected', icon: '⚡' },
  { name: 'Slack', desc: 'Team notifications & alerts', status: 'disconnected', icon: '💬' },
  { name: 'HubSpot', desc: 'CRM data sync', status: 'disconnected', icon: '🔗' },
  { name: 'Stripe', desc: 'Revenue & billing tracking', status: 'disconnected', icon: '💳' },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none
        ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}
      style={on ? { boxShadow: '0 0 8px rgba(16,185,129,0.4)' } : {}}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
          Settings
          <Settings className="h-6 w-6 text-emerald-400" />
        </h1>
        <p className="text-slate-400 mt-1.5 text-sm">
          Manage your account, preferences, and integrations.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="md:w-52 shrink-0">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-2 sticky top-6">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
                  ${activeTab === id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {activeTab === id && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* ── Profile Tab ──────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Avatar + brand */}
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
                <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" /> Business Profile
                </h3>
                <div className="flex items-center gap-5 mb-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-slate-700 ring-2 ring-emerald-500/30 flex items-center justify-center">
                      <Spade className="h-7 w-7 text-emerald-400" />
                    </div>
                    <button className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all text-[10px]">
                      <Palette className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">My Business</p>
                    <p className="text-sm text-slate-400">SaaS · Spade & Scale</p>
                    <span className="text-[11px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 font-semibold mt-1 inline-block">
                      Pro Plan
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input defaultValue="My Business" className="input-field pl-10 text-sm py-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input type="email" defaultValue="user@company.com" className="input-field pl-10 text-sm py-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Niche</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input defaultValue="SaaS" className="input-field pl-10 text-sm py-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Profit Target</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                      <input type="number" defaultValue="16000" className="input-field pl-8 text-sm py-2.5" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300
                  ${saved
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                style={!saved ? { boxShadow: '0 0 16px rgba(16,185,129,0.25)' } : {}}
              >
                {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
              </button>
            </div>
          )}

          {/* ── Notifications Tab ──────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden animate-in fade-in duration-300">
              <div className="border-b border-slate-800/60 px-6 py-4 bg-slate-900/80 flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Notification Preferences</h3>
              </div>
              <div className="divide-y divide-slate-800/40">
                {NOTIFICATION_SETTINGS.map(({ id, label, desc, defaultOn }) => (
                  <div key={id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/20 transition-colors">
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-medium text-slate-200">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    <Toggle defaultOn={defaultOn} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Security Tab ───────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
                <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400" /> Change Password
                </h3>
                <div className="space-y-4 max-w-md">
                  {(['Current Password', 'New Password', 'Confirm New Password'] as const).map((label, i) => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type={showPassword && i === 1 ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="input-field pl-10 pr-10 text-sm py-2.5"
                        />
                        {i === 1 && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-all mt-2" style={{ boxShadow: '0 0 16px rgba(16,185,129,0.25)' }}>
                    <Save className="h-4 w-4" /> Update Password
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6">
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" /> Two-Factor Authentication
                </h3>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                  Add an extra layer of security to your account with 2FA.
                </p>
                <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-700/60 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Authenticator App</p>
                      <p className="text-xs text-slate-500">Google Authenticator, Authy, etc.</p>
                    </div>
                  </div>
                  <button className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/18 transition-all">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Integrations Tab ───────────────────────── */}
          {activeTab === 'integrations' && (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 overflow-hidden animate-in fade-in duration-300">
              <div className="border-b border-slate-800/60 px-6 py-4 bg-slate-900/80 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Connected Services</h3>
              </div>
              <div className="divide-y divide-slate-800/40">
                {INTEGRATIONS.map(({ name, desc, status, icon }) => (
                  <div key={name} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-center text-lg shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-200">{name}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {status === 'connected' ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </span>
                      ) : (
                        <button className="rounded-xl border border-slate-700 bg-slate-800/50 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all">
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
