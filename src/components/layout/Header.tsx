import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { PageRoute } from '../../context/AppContext';
import {
  Search,
  Upload,
  Database,
  RefreshCw,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    settings,
    apiStatus,
    apiLatency,
    checkApiHealth,
    notifications,
    removeNotification
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const pageTitles: Record<PageRoute, { title: string; subtitle: string }> = {
    dashboard: { title: 'Multimodal Knowledge Discovery Engine', subtitle: 'Cross-modal knowledge extraction, entity linking & reasoning analytics' },
    upload: { title: 'Multimodal Ingestion Suite', subtitle: 'Upload & parse PDFs, high-res images, audio streams, and video dialogue' },
    documents: { title: 'Ingested Artifact Repository', subtitle: 'Explore source documents, bounding boxes, transcripts, and metadata' },
    pipeline: { title: 'Multimodal Processing Pipeline', subtitle: 'Real-time DAG execution, feature extraction, and knowledge graph synchronization' },
    explorer: { title: 'Entity, Relation & Triplet Explorer', subtitle: 'Semantic catalog of extracted knowledge components and confidence scores' },
    search: { title: 'Semantic & Cross-Modal Query Engine', subtitle: 'Natural language reasoning across image, text, and dialogue evidence' },
    evidence: { title: 'Evidence Provenance & Grounding', subtitle: 'Inspect source bounding boxes, audio waveforms, and timestamped transcripts' },
    graph: { title: 'Interactive Multimodal Knowledge Graph', subtitle: 'Force-directed relational network exploration with pathfinding and community clustering' },
    evaluation: { title: 'Benchmarking & Metric Evaluation', subtitle: 'F1 scores, cross-modal alignment accuracy, and hallucination reduction metrics' },
    settings: { title: 'System & Model Configurations', subtitle: 'FastAPI backend connection, LLM hyperparameters, and export tools' },
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    await checkApiHealth();
    setIsPinging(false);
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentPage('search');
    }
  };

  const currentInfo = pageTitles[currentPage];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#080c14]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Page Title & Breadcrumb */}
      <div className="min-w-0 flex-1 flex items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">{currentInfo.title}</h1>
          </div>
          <p className="text-xs text-slate-400 truncate hidden md:block">{currentInfo.subtitle}</p>
        </div>
      </div>

      {/* Global Quick Search */}
      <form onSubmit={handleGlobalSearch} className="hidden lg:flex items-center max-w-xs w-full">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search across all modalities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dataset Selector */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] truncate max-w-[130px]">{settings.activeDataset}</span>
        </div>

        {/* Backend Status Pill */}
        <button
          onClick={handleManualPing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs transition-colors"
          title="Click to ping backend"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus === 'online'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : settings.useMockBackend
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.8)]'
                : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]'
            }`}
          />
          <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
            {apiStatus === 'online' ? `${apiLatency}ms` : settings.useMockBackend ? 'Mock Engine' : 'Offline'}
          </span>
          <RefreshCw className={`w-3 h-3 text-slate-400 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* Quick Upload CTA */}
        {currentPage !== 'upload' && (
          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setCurrentPage('upload')}
          >
            <span className="hidden sm:inline">Ingest Asset</span>
          </Button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-xl border border-white/10 p-4 shadow-2xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">System Events & Notifications</span>
                </div>
                <span className="text-[10px] text-slate-400">{notifications.length} active</span>
              </div>

              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No recent activity notices.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg bg-slate-800/60 border border-white/5 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                        {n.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        {n.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                        <span className="text-slate-200">{n.message}</span>
                      </div>
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
