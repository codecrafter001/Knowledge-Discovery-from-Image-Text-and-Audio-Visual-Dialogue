import React from 'react';
import { Database, Search, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'search' | 'database' | 'sparkles';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'database',
}) => {
  const iconMap = {
    search: <Search className="w-10 h-10 text-cyan-400" />,
    database: <Database className="w-10 h-10 text-purple-400" />,
    sparkles: <Sparkles className="w-10 h-10 text-emerald-400" />,
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-white/5 bg-slate-900/30 backdrop-blur-sm">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-inner">
        {iconMap[icon]}
      </div>
      <h4 className="text-lg font-semibold text-slate-200">{title}</h4>
      <p className="text-sm text-slate-400 max-w-md mt-1.5 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
