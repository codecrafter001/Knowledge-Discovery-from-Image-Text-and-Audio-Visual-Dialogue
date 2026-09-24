import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { EvaluationMetricCard, ModalityBenchmark } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import {
  BarChart3,
  Sliders,
  Zap,
  Target,
  Layers
} from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const [metricCards, setMetricCards] = useState<EvaluationMetricCard[]>([]);
  const [benchmarks, setBenchmarks] = useState<ModalityBenchmark[]>([]);
  const [threshold, setThreshold] = useState(0.82);
  const [selectedBenchmarkDataset, setSelectedBenchmarkDataset] = useState('NASA-Multimodal-v3');

  useEffect(() => {
    const fetchEval = async () => {
      const data = await api.getEvaluationMetrics();
      setMetricCards(data.cards);
      setBenchmarks(data.benchmarks);
    };
    fetchEval();
  }, []);

  const confusionMatrixData = [
    { label: 'Technology', values: [96, 2, 1, 1, 0] },
    { label: 'Concept', values: [3, 94, 2, 0, 1] },
    { label: 'Person', values: [0, 1, 98, 1, 0] },
    { label: 'Visual Object', values: [2, 0, 1, 95, 2] },
    { label: 'Location', values: [1, 2, 0, 2, 95] },
  ];

  const classLabels = ['Tech', 'Concept', 'Person', 'Visual', 'Loc'];

  return (
    <div className="space-y-6">
      {/* Top Banner with Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Evaluation &amp; Model Benchmarks</h2>
          </div>
          <p className="text-xs text-slate-400">
            Precision, Recall, Cross-Modal Grounding, and Hallucination Mitigation metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBenchmarkDataset}
            onChange={(e) => setSelectedBenchmarkDataset(e.target.value)}
            className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
          >
            <option value="NASA-Multimodal-v3">Benchmark: NASA-Multimodal-v3</option>
            <option value="VisDial-v1.0">Benchmark: Visual Dialogue (VisDial)</option>
            <option value="MSR-VTT-Dialogue">Benchmark: MSR-VTT AV Dialogue</option>
            <option value="SciCo-Clinical">Benchmark: SciCo Oncology Graph</option>
          </select>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <StatCard
            key={i}
            label={card.label}
            value={card.value}
            change={card.change}
            isPositive={card.isPositive}
            icon={<Target className="w-6 h-6" />}
            description={card.benchmark}
            color={i === 0 ? 'cyan' : i === 1 ? 'purple' : i === 2 ? 'emerald' : 'amber'}
          />
        ))}
      </div>

      {/* Modality Benchmark Breakdown Table */}
      <Card>
        <CardHeader
          title="Modality Performance Breakdown"
          subtitle="Comparative precision, recall, and grounding scores across media channels"
          icon={<Layers className="w-4 h-4 text-cyan-400" />}
        />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Modality Channel</th>
                <th className="py-3.5 px-4">Precision</th>
                <th className="py-3.5 px-4">Recall</th>
                <th className="py-3.5 px-4">F1 Score</th>
                <th className="py-3.5 px-4">Alignment Score</th>
                <th className="py-3.5 px-4">Hallucination Rate</th>
                <th className="py-3.5 px-4">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {benchmarks.map((bm, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">{bm.modality}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">{(bm.precision * 100).toFixed(1)}%</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">{(bm.recall * 100).toFixed(1)}%</td>
                  <td className="py-3.5 px-4 text-purple-400 font-bold">{(bm.f1 * 100).toFixed(1)}%</td>
                  <td className="py-3.5 px-4 text-cyan-300 font-bold">{(bm.alignmentScore * 100).toFixed(1)}%</td>
                  <td className="py-3.5 px-4 text-rose-400 font-bold">{(bm.hallucinationRate * 100).toFixed(1)}%</td>
                  <td className="py-3.5 px-4 text-slate-400">{bm.avgLatencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Grid: Confusion Matrix + Precision-Recall Interactive Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <Card>
          <CardHeader
            title="Entity Classification Confusion Matrix"
            subtitle="Normalized percentage of cross-modal class predictions"
            icon={<Zap className="w-4 h-4 text-purple-400" />}
          />
          <CardContent className="p-5">
            <div className="space-y-3">
              {/* Labels Header */}
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono text-slate-400">
                <span>Class</span>
                {classLabels.map(l => <span key={l} className="font-bold">{l}</span>)}
              </div>

              {/* Rows */}
              {confusionMatrixData.map((row) => (
                <div key={row.label} className="grid grid-cols-6 gap-2 items-center text-xs font-mono">
                  <span className="text-slate-300 font-sans truncate font-medium text-[11px]">{row.label}</span>
                  {row.values.map((val, idx) => {
                    const isDiagonal = idx === confusionMatrixData.findIndex(r => r.label === row.label);
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-center font-bold text-xs ${
                          isDiagonal
                            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                            : val > 0
                            ? 'bg-purple-950/30 text-purple-300 border border-purple-500/20'
                            : 'bg-slate-900/50 text-slate-600'
                        }`}
                      >
                        {val}%
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Precision-Recall & Threshold Interactive Simulator */}
        <Card>
          <CardHeader
            title="Extraction Confidence vs. Recall Curve"
            subtitle="Interactive threshold tuning for relation grounding"
            icon={<Sliders className="w-4 h-4 text-emerald-400" />}
          />
          <CardContent className="p-5 space-y-5">
            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-slate-400">Confidence Threshold:</span>
                <strong className="text-cyan-400 text-sm">{(threshold * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.98"
                step="0.02"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-900 cursor-pointer"
              />
            </div>

            {/* Calculated Values */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400 block mb-1">Estimated Precision</span>
                <strong className="text-emerald-400 text-sm font-bold">
                  {(Math.min(99.4, 88 + threshold * 11)).toFixed(1)}%
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400 block mb-1">Estimated Recall</span>
                <strong className="text-cyan-400 text-sm font-bold">
                  {(Math.max(82.0, 100 - threshold * 16)).toFixed(1)}%
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400 block mb-1">F1 Synthesis</span>
                <strong className="text-purple-400 text-sm font-bold">
                  {(94.6 + (0.82 - threshold) * 4).toFixed(1)}%
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 leading-relaxed">
              Operating at threshold <strong className="text-cyan-300">{(threshold * 100).toFixed(0)}%</strong> ensures optimal trade-off between strict multimodal grounding and cross-modal relational recall.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
