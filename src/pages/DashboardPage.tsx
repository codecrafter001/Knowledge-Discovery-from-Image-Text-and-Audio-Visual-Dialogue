import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { IngestedDocument, Triplet, Entity } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge, StatusBadge } from '../components/common/Badge';
import {
  Layers,
  Share2,
  FileBox,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Search,
  Upload,
  Eye,
  Activity,
  Zap
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { setCurrentPage, inspectEvidenceForTriplet, inspectEntityInGraph } = useApp();
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [docsData, entsData, tripsData] = await Promise.all([
          api.getDocuments(),
          api.getEntities(),
          api.getTriplets()
        ]);
        setDocuments(docsData);
        setEntities(entsData);
        setTriplets(tripsData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const modalityCounts = {
    text: documents.filter(d => d.modality === 'text').length,
    image: documents.filter(d => d.modality === 'image').length,
    audio: documents.filter(d => d.modality === 'audio').length,
    video: documents.filter(d => d.modality === 'video').length,
    multimodal: documents.filter(d => d.modality === 'multimodal').length,
  };

  const totalSources = documents.length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#0e1626] to-slate-900 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unified Multimodal Triplet Engine v2.4</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Discover Grounded Knowledge Across <span className="gradient-text-cyan">Image, Text &amp; Audio-Visual Dialogue</span>
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Extract verified relational triplets, resolve cross-modal speaker coreference, and traverse rich knowledge graphs with complete provenance attribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={<Search className="w-4 h-4" />}
              onClick={() => setCurrentPage('search')}
            >
              Ask Cross-Modal Query
            </Button>
            <Button
              variant="glass"
              size="md"
              icon={<Share2 className="w-4 h-4 text-cyan-400" />}
              onClick={() => setCurrentPage('graph')}
            >
              Explore Knowledge Graph
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<Upload className="w-4 h-4 text-purple-400" />}
              onClick={() => setCurrentPage('upload')}
            >
              Ingest Asset
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Extracted Entities"
          value={loading ? '...' : entities.length}
          change="+18% this week"
          isPositive={true}
          color="cyan"
          icon={<Layers className="w-6 h-6" />}
          description="Across 8 semantic categories"
        />
        <StatCard
          label="Verified Triplets"
          value={loading ? '...' : triplets.length}
          change="+24% synced"
          isPositive={true}
          color="purple"
          icon={<Share2 className="w-6 h-6" />}
          description="High-confidence relations"
        />
        <StatCard
          label="Multimodal Sources"
          value={loading ? '...' : totalSources}
          change="100% indexed"
          isPositive={true}
          color="emerald"
          icon={<FileBox className="w-6 h-6" />}
          description="Images, audio, text & video"
        />
        <StatCard
          label="Average Confidence"
          value="95.2%"
          change="+2.8% vs baseline"
          isPositive={true}
          color="amber"
          icon={<CheckCircle2 className="w-6 h-6" />}
          description="Cross-modal verification index"
        />
      </div>

      {/* Secondary Grid: Discovery Feed + Modality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Discovery Feed (2 Cols) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Recent Cross-Modal Triplet Discoveries"
              subtitle="Grounded Subject-Predicate-Object triplets verified across modalities"
              icon={<Zap className="w-4 h-4" />}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage('explorer')}
                >
                  View All Triplets <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              }
            />
            <CardContent className="flex-1 p-0 divide-y divide-white/5">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading discovery feed...</div>
              ) : (
                triplets.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ModalityBadge modality={trip.modality} size="sm" />
                        <span className="text-xs text-slate-400 font-mono">
                          Conf: <strong className="text-cyan-400">{(trip.confidence * 100).toFixed(1)}%</strong>
                        </span>
                        <StatusBadge status={trip.verified ? 'verified' : 'queued'} />
                      </div>

                      {/* Triplet representation */}
                      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                          {trip.subjectName}
                        </span>
                        <span className="text-xs font-mono text-slate-400 px-1.5">
                          ──[{trip.predicate}]──▶
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30">
                          {trip.objectName}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        "{trip.evidenceSnippet}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="glass"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />}
                        onClick={() => inspectEvidenceForTriplet(trip)}
                      >
                        Evidence
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Modality Breakdown & Pipeline Pulse */}
        <div className="space-y-6">
          {/* Modality Breakdown */}
          <Card>
            <CardHeader
              title="Modality Distribution"
              subtitle="Breakdown of ingested knowledge artifacts"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      Text &amp; Clinical PDFs
                    </span>
                    <span className="font-mono text-slate-400">{modalityCounts.text} docs</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(modalityCounts.text / totalSources) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Planetary &amp; Multispectral Images
                    </span>
                    <span className="font-mono text-slate-400">{modalityCounts.image} images</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(modalityCounts.image / totalSources) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      Audio Dialogues &amp; Speeches
                    </span>
                    <span className="font-mono text-slate-400">{modalityCounts.audio} streams</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(modalityCounts.audio / totalSources) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      Audio-Visual Video Feeds
                    </span>
                    <span className="font-mono text-slate-400">{modalityCounts.video} videos</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(modalityCounts.video / totalSources) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Multi-modal Alignment:</span>
                <span className="font-mono text-cyan-400 font-semibold">94.8% Synced</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Pipeline Status */}
          <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#0e1726]">
            <CardHeader
              title="Pipeline Throughput"
              subtitle="Autonomous multi-model ingestion status"
              icon={<Activity className="w-4 h-4" />}
            />
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs">
                <span className="text-slate-300">Extraction Latency:</span>
                <span className="font-mono text-emerald-400 font-bold">184 ms</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs">
                <span className="text-slate-300">Grounding Accuracy:</span>
                <span className="font-mono text-cyan-400 font-bold">93.2%</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs">
                <span className="text-slate-300">Vector Embeddings:</span>
                <span className="font-mono text-purple-400 font-bold">1536-dim CLIP/Whisper</span>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                onClick={() => setCurrentPage('pipeline')}
              >
                Inspect Execution DAG
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Featured Entities Highlight Strip */}
      <Card>
        <CardHeader
          title="Prominent Knowledge Nodes"
          subtitle="Frequently referenced entities with cross-modal grounding"
          icon={<Cpu className="w-4 h-4" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('explorer')}
            >
              Explore Catalog <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {entities.slice(0, 4).map((ent) => (
              <div
                key={ent.id}
                onClick={() => inspectEntityInGraph(ent)}
                className="p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {ent.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Freq: {ent.frequency}</span>
                </div>
                <h4 className="font-semibold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                  {ent.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {ent.description}
                </p>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Grounding:</span>
                  <span className="text-emerald-400 font-mono font-semibold">{(ent.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
