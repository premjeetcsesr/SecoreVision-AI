import React, { useState } from 'react';
import { Popup } from './popup/Popup';
import { DashboardShell } from './dashboard/DashboardShell';
import { ShieldCheck, Smartphone, Monitor } from 'lucide-react';
import { Badge } from './shared/Badge';

export const DevPreview: React.FC = () => {
  const [mode, setMode] = useState<'dashboard' | 'popup'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Dev Bar at Top */}
      <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SecureVision AI</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">HackIndia AI &amp; CyberTech Hackathon 2026 (KIT)</span>
          <Badge variant="privacy" size="sm">
            Live Dev Simulator
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">View Mode:</span>
          <button
            onClick={() => setMode('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors font-medium ${
              mode === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Full Dashboard &amp; Screens</span>
          </button>
          <button
            onClick={() => setMode('popup')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors font-medium ${
              mode === 'popup'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Extension Popup Frame</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {mode === 'dashboard' ? (
          <DashboardShell />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/80">
            <div className="text-center mb-4">
              <h2 className="text-sm font-bold text-white">
                Chrome Extension Popup Simulator (380px x 560px)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates clicking the SecureVision AI icon in the Chrome Extension toolbar.
              </p>
            </div>
            <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden ring-1 ring-slate-800">
              <Popup onOpenDashboard={() => setMode('dashboard')} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
