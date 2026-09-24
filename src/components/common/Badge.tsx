import React from 'react';
import type { Modality } from '../../types';
import { FileText, Image as ImageIcon, Mic, Video, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ModalityBadgeProps {
  modality: Modality;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ModalityBadge: React.FC<ModalityBadgeProps> = ({ modality, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  const getStyle = () => {
    switch (modality) {
      case 'text':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <FileText className="w-3.5 h-3.5" />,
          label: 'Text'
        };
      case 'image':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <ImageIcon className="w-3.5 h-3.5" />,
          label: 'Image'
        };
      case 'audio':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          icon: <Mic className="w-3.5 h-3.5" />,
          label: 'Audio Dialogue'
        };
      case 'video':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          icon: <Video className="w-3.5 h-3.5" />,
          label: 'Audio-Visual'
        };
      case 'multimodal':
      default:
        return {
          bg: 'bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-pink-500/15 border-cyan-500/40 text-cyan-300',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          label: 'Cross-Modal'
        };
    }
  };

  const style = getStyle();

  return (
    <span className={`inline-flex items-center rounded-full border shadow-sm ${style.bg} ${sizeClasses[size]}`}>
      {showIcon && style.icon}
      <span>{style.label}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'verified':
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>{label || 'Verified'}</span>
        </span>
      );
    case 'running':
    case 'extracting':
    case 'embedding':
    case 'preprocessing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span>{label || status}</span>
        </span>
      );
    case 'queued':
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 border border-slate-500/30 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{label || 'Queued'}</span>
        </span>
      );
    case 'failed':
    case 'error':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertCircle className="w-3 h-3" />
          <span>{label || 'Failed'}</span>
        </span>
      );
  }
};
