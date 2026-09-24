import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { PageRoute } from '../../context/AppContext';
import {
  LayoutDashboard,
  UploadCloud,
  FileBox,
  GitBranch,
  Layers,
  Search,
  Eye,
  Share2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';

interface NavItem {
  id: PageRoute;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  group?: string;
}

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, apiStatus, apiLatency, settings } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, group: 'Overview' },
    { id: 'upload', label: 'Multimodal Upload', icon: <UploadCloud className="w-5 h-5" />, badge: 'Live', group: 'Ingestion' },
    { id: 'documents', label: 'Document Library', icon: <FileBox className="w-5 h-5" />, group: 'Ingestion' },
    { id: 'pipeline', label: 'Processing Pipeline', icon: <GitBranch className="w-5 h-5" />, group: 'Extraction' },
    { id: 'explorer', label: 'Knowledge Explorer', icon: <Layers className="w-5 h-5" />, group: 'Discovery' },
    { id: 'search', label: 'Cross-Modal Search', icon: <Search className="w-5 h-5" />, badge: 'AI', group: 'Discovery' },
    { id: 'evidence', label: 'Evidence & Grounding', icon: <Eye className="w-5 h-5" />, group: 'Discovery' },
    { id: 'graph', label: 'Knowledge Graph', icon: <Share2 className="w-5 h-5" />, group: 'Graph RAG' },
    { id: 'evaluation', label: 'Evaluation & Metrics', icon: <BarChart3 className="w-5 h-5" />, group: 'Analysis' },
    { id: 'settings', label: 'System & API Settings', icon: <Settings className="w-5 h-5" />, group: 'Config' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#080c14] border-r border-white/10 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 shrink-0">
              <Cpu className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono">SYNAPSE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Knowledge Discovery</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Cpu className="w-5 h-5 text-slate-950 font-bold" />
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              {/* Active Indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.8)]" />
              )}

              <div
                className={`transition-colors shrink-0 ${
                  isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between text-left min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        item.badge === 'AI'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle when collapsed */}
      {collapsed && (
        <div className="p-3 border-t border-white/10 flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Backend Status Footer */}
      {!collapsed && (
        <div className="p-3.5 m-3 rounded-xl bg-slate-900/90 border border-white/10 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-medium">Backend Engine</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                apiStatus === 'online'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : settings.useMockBackend
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {apiStatus === 'online' ? (
                <>
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                  FastAPI ({apiLatency}ms)
                </>
              ) : settings.useMockBackend ? (
                <>
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  Mock Neural Engine
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-rose-400" />
                  Offline
                </>
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Model: <span className="text-slate-300 font-mono">{settings.llmModel}</span>
          </p>
        </div>
      )}
    </aside>
  );
};
