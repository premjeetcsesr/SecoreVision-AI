import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Eye,
  Activity,
  Settings as SettingsIcon,
  Flame,
  Cpu,
  Lock,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Overview } from './screens/Overview';
import { Agent } from './screens/Agent';
import { PrivacyCenter } from './screens/PrivacyCenter';
import { Vision } from './screens/Vision';
import { Performance } from './screens/Performance';
import { Settings } from './screens/Settings';

export type DashboardTab = 'overview' | 'agent' | 'privacy' | 'vision' | 'performance' | 'settings';

export const DashboardShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as DashboardTab | null;
    const viewParam = params.get('view');

    if (tabParam && ['overview', 'agent', 'privacy', 'vision', 'performance', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (viewParam === 'preview') {
      setActiveTab('privacy');
    } else if (viewParam === 'tasks') {
      setActiveTab('agent');
    } else if (viewParam === 'settings') {
      setActiveTab('settings');
    }
  }, []);

  const handleNavigate = (tab: DashboardTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, badge: null },
    { id: 'agent', label: 'Agent Command', icon: <Sparkles className="w-4 h-4" />, badge: 'AI' },
    { id: 'privacy', label: 'Privacy Center', icon: <ShieldCheck className="w-4 h-4" />, badge: 'Shield' },
    { id: 'vision', label: 'Local Vision & OCR', icon: <Eye className="w-4 h-4" />, badge: 'WebGPU' },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" />, badge: null },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, badge: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              SecureVision <span className="text-emerald-400">AI</span>
            </div>
            <div className="text-[10px] text-slate-400">Privacy Browser Agent</div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 bg-slate-900/95 lg:bg-slate-900/50 backdrop-blur-md border-r border-slate-800/80 p-5 shrink-0 z-30 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto flex flex-col justify-between`}
        >
          <div className="space-y-6">
            {/* Brand Title */}
            <div className="hidden lg:flex items-center gap-3 pb-2 border-b border-slate-800/60">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
                    SecureVision <span className="text-emerald-400">AI</span>
                  </h1>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Zero-Leakage MV3
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5" aria-label="Sidebar Navigation">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-1">
                Main Console
              </div>

              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Sandbox Launcher */}
            <div className="pt-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-1">
                Testing Sandbox
              </div>
              <button
                onClick={() => window.open('/demo.html', '_blank')}
                className="w-full mt-1.5 p-3 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 transition-all text-left group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Synthetic Form</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Safe testbed with mock PII, credit cards &amp; buttons.
                </p>
              </button>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="pt-6 border-t border-slate-800/60 hidden lg:block">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  Privacy Gate
                </span>
                <span className="text-[10px] font-mono text-emerald-400">FAIL-CLOSED</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                0 bytes of raw credentials or visual frames leave client unmasked.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && <Overview onNavigate={(t) => handleNavigate(t as DashboardTab)} />}
          {activeTab === 'agent' && <Agent />}
          {activeTab === 'privacy' && <PrivacyCenter />}
          {activeTab === 'vision' && <Vision />}
          {activeTab === 'performance' && <Performance />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900/90 border-t border-slate-800 py-3.5 px-6 text-center text-xs text-slate-400">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-bold text-white">SECUREVISION AI</span>
            <span>•</span>
            <span>Client-Side Zero-Leakage Architecture</span>
            <span>•</span>
            <span className="text-emerald-400">HackIndia AI &amp; CyberTech Hackathon 2026</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Manifest V3 • WebGPU • Local OCR • Fail-Closed Privacy Gate
          </div>
        </div>
      </footer>
    </div>
  );
};
