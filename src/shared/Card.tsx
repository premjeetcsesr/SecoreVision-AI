import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  badge,
  headerAction,
  footer,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`bg-slate-900/90 rounded-2xl border border-slate-800 shadow-lg shadow-black/20 text-slate-100 transition-all duration-200 ${className}`}
    >
      {(title || headerAction || badge) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              {title && <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>}
              {badge}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
      {footer && <div className="px-5 py-3 bg-slate-950/70 border-t border-slate-800 rounded-b-2xl">{footer}</div>}
    </div>
  );
};
