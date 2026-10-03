import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} role="status" aria-label="Loading content">
      <div className="h-4 bg-slate-800 rounded w-1/3"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-slate-800/80 rounded w-full"></div>
          <div className="h-3 bg-slate-800/60 rounded w-5/6"></div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};
