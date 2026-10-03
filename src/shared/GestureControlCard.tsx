import React from 'react';
import { RecognizedGesture } from '../services/handGestureEngine';

interface GestureControlCardProps {
  isActive: boolean;
  currentGesture: RecognizedGesture;
  gestureLabel: string;
  gestureIcon: string;
  cursorX: number;
  cursorY: number;
  onEnable: () => void;
  onDisable: () => void;
}

export const GestureControlCard: React.FC<GestureControlCardProps> = ({
  isActive,
  currentGesture,
  gestureLabel,
  gestureIcon,
  cursorX,
  cursorY,
  onEnable,
  onDisable,
}) => {
  const gestures = [
    { id: 'move', icon: '☝️', label: 'Index finger', action: 'Move' },
    { id: 'pinch', icon: '🤏', label: 'Thumb + Index pinch', action: 'Click' },
    { id: 'scroll', icon: '✌️', label: 'Two fingers', action: 'Scroll' },
    { id: 'fist', icon: '✊', label: 'Fist', action: 'Pause / stop' },
    { id: 'open_palm', icon: '🖐️', label: 'Open palm', action: 'Emergency Stop' },
    { id: 'thumb_up', icon: '👍', label: 'Thumb up', action: 'Confirm' },
  ];

  return (
    <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 text-slate-100 shadow-2xl space-y-3.5 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🖐️</span>
          <h3 className="font-bold text-sm text-white tracking-wide">Gesture Control</h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          <span className={isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            {isActive ? '● Active' : '● Disabled'}
          </span>
        </div>
      </div>

      {/* Status & Coordinates Display */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">Live Gesture</span>
          <span className="font-bold text-emerald-300 flex items-center gap-1 mt-0.5 text-[11px] truncate">
            <span>{gestureIcon}</span>
            <span>{gestureLabel}</span>
          </span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block uppercase">System Cursor</span>
          <span className="font-bold text-white mt-0.5 text-[11px] block">
            {isActive ? `${cursorX}, ${cursorY}` : '---, ---'}
          </span>
        </div>
      </div>

      {/* Enable / Disable Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEnable}
          disabled={isActive}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
            isActive
              ? 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/50 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95'
          }`}
        >
          <span>[ Enable ]</span>
        </button>

        <button
          type="button"
          onClick={onDisable}
          disabled={!isActive}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
            !isActive
              ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 cursor-pointer active:scale-95'
          }`}
        >
          <span>[ Disable ]</span>
        </button>
      </div>

      {/* Gesture Mapping Cheat Sheet */}
      <div className="space-y-1 pt-1 border-t border-slate-800/80">
        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
          Supported Air Gestures:
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
          {gestures.map((g) => {
            const isCurrent = currentGesture === g.id;
            return (
              <div
                key={g.id}
                className={`p-1.5 rounded-lg border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-bold scale-[1.02]'
                    : 'border-slate-800/60 bg-slate-950/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{g.icon}</span>
                  <span className="text-[11px]">{g.action}</span>
                </div>
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
