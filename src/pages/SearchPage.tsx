import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { SearchQueryResponse, Modality } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge } from '../components/common/Badge';
import {
  Search,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  FileText,
  Share2,
  Compass
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [query, setQuery] = useState('How does cryogenic cooling impact quantum transmon coherence during dialogued experiments?');
  const [retrievalMode, setRetrievalMode] = useState<'hybrid_cross_modal' | 'vector_semantic' | 'knowledge_graph' | 'bm25'>('hybrid_cross_modal');
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState<SearchQueryResponse | null>(null);

  const sampleQueries = [
    'How does cryogenic cooling impact quantum transmon coherence during dialogued experiments?',
    'What geological features did the robotic arm sample in Jezero delta?',
    'What safety maneuvers did the autonomous vehicle execute around the crosswalk pedestrian?',
    'Which immunotherapy agents target KRAS mutations in clinical oncology reports?'
  ];

  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim()) return;

    setIsSearching(true);
    try {
      const res = await api.executeQuery(q, retrievalMode, modalityFilter);
      setResponse(res);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Run initial default search for instant showcase
    handleSearch();
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Bar & Mode Selector */}
      <Card className="bg-gradient-to-r from-slate-900 via-[#0a1120] to-slate-900 border-cyan-500/30">
        <CardContent className="p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ask any cross-modal question across audio dialogue, imagery & text..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all font-medium"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSearching}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Synthesize
            </Button>
          </form>

          {/* Strategy Selection & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Retrieval Strategy:</span>
              <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-white/10">
                {[
                  { id: 'hybrid_cross_modal', label: 'Hybrid Cross-Modal' },
                  { id: 'knowledge_graph', label: 'KG Traversal' },
                  { id: 'vector_semantic', label: 'Dense Vector' },
                  { id: 'bm25', label: 'BM25 Keyword' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRetrievalMode(mode.id as any)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      retrievalMode === mode.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Modality Scope:</span>
              <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-white/10">
                {(['all', 'text', 'image', 'audio', 'video'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalityFilter(m)}
                    className={`px-2.5 py-1 rounded-md uppercase text-[10px] font-mono transition-colors ${
                      modalityFilter === m
                        ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Query Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Example Queries:
            </span>
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-cyan-300 border border-white/5 text-[11px] transition-colors truncate max-w-xs"
              >
                {sq}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Response Section */}
      {isSearching ? (
        <div className="p-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto animate-spin">
            <Zap className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Fusing Multimodal Representations &amp; Traversing Knowledge Graph...
          </p>
        </div>
      ) : response ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Synthesized Answer & Reasoning (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Answer Card */}
            <Card className="border-cyan-500/40 bg-[#0a101d]">
              <CardHeader
                title="Synthesized Cross-Modal Insight"
                subtitle={`Grounded Answer (${response.retrievalMode.replace(/_/g, ' ').toUpperCase()})`}
                icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
                action={
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {response.executionTimeMs}ms
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      {(response.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  </div>
                }
              />
              <CardContent className="p-6">
                <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-sans">
                  {response.answer}
                </p>
              </CardContent>
            </Card>

            {/* Multimodal Reasoning Trace */}
            <Card>
              <CardHeader
                title="Reasoning Chain &amp; Graph Traversal Steps"
                subtitle="Step-by-step provenance verification across modalities"
                icon={<Compass className="w-4 h-4 text-purple-400" />}
              />
              <CardContent className="space-y-3 p-5">
                {response.reasoningChain.map((step) => (
                  <div
                    key={step.step}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-3.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-purple-500/40 mt-0.5">
                      {step.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-cyan-300">{step.type}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {(step.confidence * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                      <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-white/5">
                        Cited Evidence: <span className="text-slate-200">{step.evidenceCited}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Grounded Citations */}
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Grounded Citations"
                subtitle={`${response.citations.length} primary source artifacts linked`}
                icon={<FileText className="w-4 h-4 text-emerald-400" />}
              />
              <CardContent className="p-4 space-y-3">
                {response.citations.map((cit) => (
                  <div
                    key={cit.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-cyan-500/40 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <ModalityBadge modality={cit.modality} size="sm" />
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        {(cit.groundingScore * 100).toFixed(0)}% Term Coverage
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-200 line-clamp-1">{cit.docTitle}</h4>

                    <p className="text-slate-400 italic line-clamp-2 bg-slate-950/40 p-2 rounded border border-white/5">
                      "{cit.snippet}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      {cit.timestampRange && <span>Timestamp: <strong className="text-cyan-300">{cit.timestampRange}</strong></span>}
                      {cit.boundingBoxLabel && <span>Box: <strong className="text-amber-300">{cit.boundingBoxLabel}</strong></span>}
                      {cit.pageNumber && <span>Page: <strong className="text-purple-300">{cit.pageNumber}</strong></span>}

                      <button
                        onClick={() => setCurrentPage('evidence')}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                      >
                        Inspect <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="glass"
                  size="sm"
                  className="w-full mt-2"
                  icon={<Share2 className="w-3.5 h-3.5 text-cyan-400" />}
                  onClick={() => setCurrentPage('graph')}
                >
                  Inspect Subgraph in 3D
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};
