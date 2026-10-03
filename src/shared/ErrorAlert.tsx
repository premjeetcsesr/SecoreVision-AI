import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Operation Error',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-start justify-between gap-3 text-rose-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
          <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="border-rose-700 bg-rose-900/50 text-rose-200 hover:bg-rose-900 shrink-0"
        >
          Retry
        </Button>
      )}
    </div>
  );
};
