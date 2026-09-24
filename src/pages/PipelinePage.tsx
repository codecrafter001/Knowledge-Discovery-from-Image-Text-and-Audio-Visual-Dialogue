import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { PipelineStage, PipelineLog } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  GitBranch,
  Terminal,
  Activity,
  Play,
  CheckCircle2,
  Cpu,
  Search,
  ArrowRight
} from 'lucide-react';

export const PipelinePage: React.FC = () => {
  const { addNotification } = useApp();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [isReindexing, setIsReindexing] = useState(false);

  useEffect(() => {
    const fetchPipeline = async () => {
      const [stagesData, logsData] = await Promise.all([
        api.getPipelineStages(),
        api.getPipelineLogs()
      ]);
      setStages(stagesData);
      setLogs(logsData);
      if (stagesData.length > 0) setSelectedStage(stagesData[0]);
    };
    fetchPipeline();
  }, []);

  const handleTriggerReindex = async () => {
    setIsReindexing(true);
    addNotification('info', 'Executing multimodal pipeline re-indexing...');

    // Simulate real-time log append
    const newLogId = `log-${Date.now()}`;
    const newLog: PipelineLog = {
      id: newLogId,
      timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
      stageId: 'stage-1',
      stageName: 'Ingestion',
      level: 'info',
      message: 'Triggered manual end-to-end knowledge re-indexing job.'
    };
    setLogs(prev => [newLog, ...prev]);

    await new Promise(r => setTimeout(r, 1200));

    const successLog: PipelineLog = {
      id: `log-${Date.now()}-2`,
      timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
      stageId: 'stage-5',
      stageName: 'Vector Indexing',
      level: 'success',
      message: 'Knowledge graph vertices and 1536-dim vector indices verified.'
    };
    setLogs(prev => [successLog, ...prev]);
    setIsReindexing(false);
    addNotification('success', 'Pipeline re-indexing completed successfully.');
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = logFilter === 'all' || log.level === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.stageName.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Overview & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Asynchronous Multimodal DAG Pipeline</h2>
          </div>
          <p className="text-xs text-slate-400">
            5-stage continuous ingestion, multimodal embedding, coreference alignment &amp; Neo4j verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            loading={isReindexing}
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={handleTriggerReindex}
          >
            Re-run Pipeline DAG
          </Button>
        </div>
      </div>

      {/* Interactive DAG Stage Flowchart */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Pipeline Execution DAG (Click stage to inspect parameters)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {stages.map((stage, idx) => {
            const isSelected = selectedStage?.id === stage.id;
            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStage(stage)}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(0,242,254,0.15)] ring-1 ring-cyan-400/30'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90'
                }`}
              >
                {/* Stage Step Number Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/40">
                    {stage.order}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready</span>
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-100 line-clamp-2 leading-snug">
                    {stage.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 truncate font-mono">
                    {stage.modelEngine}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Latency:</span>
                  <strong className="text-cyan-400">{stage.latencyMs}ms</strong>
                </div>

                {/* Arrow connector between stages */}
                {idx < stages.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Stage Inspector & Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Stage Detail Inspector (1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader
              title={selectedStage ? selectedStage.name : 'Stage Inspector'}
              subtitle={selectedStage ? `Order #${selectedStage.order} • ${selectedStage.modality}` : 'Select a stage'}
              icon={<Cpu className="w-4 h-4" />}
            />
            <CardContent className="space-y-4 text-xs">
              {selectedStage ? (
                <>
                  <div>
                    <label className="text-slate-400 block mb-1">Architecture Description</label>
                    <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      {selectedStage.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Model &amp; Compute Engine</label>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-cyan-300 font-mono">
                      {selectedStage.modelEngine}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400 block">Avg Latency</span>
                      <strong className="text-emerald-400 font-mono text-sm">{selectedStage.latencyMs} ms</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="text-slate-400 block">Throughput</span>
                      <strong className="text-purple-400 font-mono text-sm">{selectedStage.throughput}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1.5">Runtime Metrics &amp; Parameters</label>
                    <div className="space-y-1.5">
                      {Object.entries(selectedStage.metrics).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-white/5"
                        >
                          <span className="text-slate-400">{key}:</span>
                          <span className="text-slate-200 font-mono font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Select any stage above to inspect runtime configurations.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Terminal Log Stream (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Execution &amp; Ingestion Log Stream"
              subtitle="Real-time multi-model telemetry logs and verification triggers"
              icon={<Terminal className="w-4 h-4 text-cyan-400" />}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative w-36 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-lg p-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              }
            />

            <CardContent className="flex-1 p-4 bg-[#05080f] font-mono text-xs overflow-y-auto max-h-[460px] space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No logs found matching filter.</div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 hover:border-white/10 transition-colors flex items-start gap-3 leading-relaxed"
                  >
                    <span className="text-slate-500 text-[11px] shrink-0">{log.timestamp}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                        log.level === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : log.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-400 font-bold shrink-0">[{log.stageName}]</span>
                    <span className="text-slate-200 break-all">{log.message}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
