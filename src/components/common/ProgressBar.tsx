import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  color?: 'cyan' | 'purple' | 'emerald' | 'amber';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'cyan',
  height = 'md',
  showLabel = false,
  label,
  animated = true,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const gradientMap = {
    cyan: 'from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(0,242,254,0.5)]',
    purple: 'from-purple-500 to-pink-500 shadow-[0_0_12px_rgba(127,0,255,0.5)]',
    emerald: 'from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    amber: 'from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-300 font-medium">{label || 'Progress'}</span>
          <span className="text-slate-400 font-mono">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5 ${heightClasses[height]}`}>
        <div
          className={`h-full bg-gradient-to-r ${gradientMap[color]} transition-all duration-300 rounded-full ${
            animated ? 'animate-pulse-slow' : ''
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
