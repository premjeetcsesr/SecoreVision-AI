import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'shield';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 active:bg-emerald-700 shadow-sm shadow-emerald-950',
    shield:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 active:bg-emerald-700 shadow-sm shadow-emerald-500/20',
    secondary:
      'bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-slate-500 active:bg-slate-750 border border-slate-700',
    outline:
      'border border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 focus:ring-slate-500 active:bg-slate-700',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 active:bg-rose-700 shadow-sm shadow-rose-950',
    ghost:
      'text-slate-300 hover:text-white hover:bg-slate-800/80 focus:ring-slate-500',
  };

  const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
