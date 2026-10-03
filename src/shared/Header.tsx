import React from 'react';
import { ShieldCheck, Eye, Cpu, Settings as SettingsIcon, LayoutDashboard, ListTodo } from 'lucide-react';
import { Badge } from './Badge';

export type ActiveView = 'dashboard' | 'preview' | 'tasks' | 'settings';

interface HeaderProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isCompact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  isCompact = false,
}) => {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'preview', label: 'Privacy Preview', icon: <Eye className="w-4 h-4" /> },
    { id: 'tasks', label: 'Task Panel', icon: <ListTodo className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
      <div className={`mx-auto ${isCompact ? 'px-4 py-3' : 'px-6 py-3.5'} flex items-center justify-between gap-4`}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                SecureVision <span className="text-emerald-400">AI</span>
              </h1>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                MV3
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-none">
              Privacy-Preserving Visual AI Agent • <span className="text-slate-500">HackIndia 2026</span>
            </p>
          </div>
        </div>

        {/* Navigation */}
        {!isCompact && (
          <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <Badge variant="privacy" size="sm" pulse>
            <span className="font-medium">Shield Active</span>
          </Badge>
          {!isCompact && (
            <Badge variant="neutral" size="sm">
              <Cpu className="w-3 h-3 text-emerald-400 mr-1" />
              <span>WebGPU</span>
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
};
