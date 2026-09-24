import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  description?: string;
  color?: 'cyan' | 'purple' | 'emerald' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon,
  description,
  color = 'cyan',
}) => {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-400 border-cyan-500/30',
    purple: 'from-purple-500/20 to-pink-500/5 text-purple-400 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/30',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/30',
  };

  return (
    <Card className="relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
      {/* Subtle top glow */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorMap[color]} opacity-80`} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <h4 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 font-mono tracking-tight">{value}</h4>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} border shadow-inner`}>
            {icon}
          </div>
        </div>

        {(change || description) && (
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-white/5">
            {change && (
              <span className={`inline-flex items-center font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {change}
              </span>
            )}
            {description && (
              <span className="text-slate-400 truncate ml-auto">{description}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
