import React from 'react';

export type BadgeVariant = 'privacy' | 'neutral' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    privacy: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    neutral: 'bg-slate-800/90 text-slate-300 border-slate-700/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    info: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    purple: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'privacy' ? 'bg-emerald-400' : 'bg-slate-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              variant === 'privacy' ? 'bg-emerald-400' : 'bg-slate-400'
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
};
