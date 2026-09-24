import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-semibold hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 active:scale-[0.98]',
    secondary: 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 shadow-sm active:scale-[0.98]',
    glass: 'glass-panel hover:bg-slate-800/60 text-slate-200 border border-white/10 hover:border-cyan-500/40 shadow-sm active:scale-[0.98]',
    danger: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-[0.98]',
    ghost: 'text-slate-400 hover:text-slate-100 hover:bg-white/5 active:scale-[0.98]',
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
