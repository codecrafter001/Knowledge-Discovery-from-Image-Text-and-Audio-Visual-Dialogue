import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  hoverEffect = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border ${
        glow
          ? 'border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.1)] bg-slate-900/80 backdrop-blur-md'
          : 'border-white/10 bg-slate-900/60 backdrop-blur-md'
      } ${
        hoverEffect
          ? 'transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-900/90 hover:shadow-lg hover:shadow-cyan-950/30 cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className = '' }) => {
  return (
    <div className={`p-4 sm:p-5 border-b border-white/5 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 truncate text-base">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
};
