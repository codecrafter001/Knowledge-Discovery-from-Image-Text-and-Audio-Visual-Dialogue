import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { EvidenceItem, Modality } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge } from '../components/common/Badge';
import {
  Eye,
  Volume2,
  FileText,
  Image as ImageIcon,
  Share2,
  ShieldCheck
} from 'lucide-react';

export const EvidencePage: React.FC = () => {
  const { selectedTriplet, setCurrentPage } = useApp();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [modalityFilter, setModalityFilter] = useState<Modality | 'all'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvidence = async () => {
      setLoading(true);
      try {
        const data = await api.getEvidenceItems();
        setEvidenceList(data);
        if (data.length > 0) {
          // If a triplet was passed via context, select matching evidence
          if (selectedTriplet) {
            const match = data.find(e => e.tripletId === selectedTriplet.id);
            setSelectedEvidence(match || data[0]);
          } else {
            setSelectedEvidence(data[0]);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvidence();
  }, [selectedTriplet]);

  const filteredEvidence = evidenceList.filter(item => {
    return modalityFilter === 'all' || item.modality === modalityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Cross-Modal Evidentiary Grounding</h2>
          </div>
          <p className="text-xs text-slate-400">
            Inspect primary source media, bounding box coordinates, acoustic speaker timestamps, and text spans
          </p>
        </div>

        {/* Modality Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/10 text-xs">
          {(['all', 'image', 'audio', 'video', 'text'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModalityFilter(m)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${
                modalityFilter === m
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Evidence List (1 col) + Evidence Inspector (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Evidence Item Selector */}
        <div className="space-y-3 lg:max-h-[700px] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading evidence items...</div>
          ) : filteredEvidence.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No evidence items for this modality filter.</div>
          ) : (
            filteredEvidence.map((ev) => {
              const isSelected = selectedEvidence?.id === ev.id;
              return (
                <Card
                  key={ev.id}
                  hoverEffect={true}
                  onClick={() => setSelectedEvidence(ev)}
                  className={`p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-400/80 shadow-[0_0_15px_rgba(0,242,254,0.15)] ring-1 ring-cyan-400/30'
                      : 'border-white/5 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <ModalityBadge modality={ev.modality} size="sm" />
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {(ev.confidence * 100).toFixed(0)}% Conf
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-100 line-clamp-1 mb-1">
                    {ev.docTitle}
                  </h4>

                  <p className="text-[11px] font-mono text-cyan-300 line-clamp-1 bg-slate-950/60 p-1.5 rounded border border-white/5">
                    {ev.tripletText}
                  </p>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Deep Evidence Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEvidence ? (
            <Card className="border-cyan-500/30 bg-[#090f1b]">
              <CardHeader
                title="Grounded Provenance Inspector"
                subtitle={`Source: ${selectedEvidence.docTitle}`}
                icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
                action={
                  <ModalityBadge modality={selectedEvidence.modality} size="md" />
                }
              />
              <CardContent className="space-y-6">
                {/* Triplet Banner */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">
                      Extracted Relational Triplet
                    </span>
                    <p className="text-xs sm:text-sm font-semibold font-mono text-cyan-300">
                      {selectedEvidence.tripletText}
                    </p>
                  </div>
                  <Button
                    variant="glass"
                    size="sm"
                    icon={<Share2 className="w-3.5 h-3.5 text-cyan-400" />}
                    onClick={() => setCurrentPage('graph')}
                  >
                    Graph Node
                  </Button>
                </div>

                {/* Modality Grounding Inspector Media */}
                {selectedEvidence.modality === 'image' && selectedEvidence.imageUrl && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      Visual Spatial Grounding
                    </h4>
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center max-h-[380px]">
                      {/* Wrapper sized to the rendered image so percentage boxes line up with it */}
                      <div className="relative inline-block">
                      <img
                        src={selectedEvidence.imageUrl}
                        alt="Evidence image"
                        className="block max-w-full max-h-[380px]"
                      />
                      {/* Bounding box */}
                      {selectedEvidence.boundingBox && (
                        <div
                          className="absolute border-2 rounded shadow-lg animate-pulse-slow"
                          style={{
                            borderColor: selectedEvidence.boundingBox.color,
                            backgroundColor: `${selectedEvidence.boundingBox.color}25`,
                            left: `${selectedEvidence.boundingBox.x}%`,
                            top: `${selectedEvidence.boundingBox.y}%`,
                            width: `${selectedEvidence.boundingBox.width}%`,
                            height: `${selectedEvidence.boundingBox.height}%`,
                          }}
                        >
                          <div
                            className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 shadow-md"
                            style={{ backgroundColor: selectedEvidence.boundingBox.color }}
                          >
                            {selectedEvidence.boundingBox.label} ({(selectedEvidence.boundingBox.confidence * 100).toFixed(0)}%)
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                    {selectedEvidence.textSnippet && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-white/5">
                        <span className="text-slate-500 uppercase tracking-wider mr-2">
                          {selectedEvidence.evidenceSource === 'caption' ? 'Caption (whole image)' : 'OCR text'}
                        </span>
                        "{selectedEvidence.textSnippet}"
                      </p>
                    )}
                  </div>
                )}

                {selectedEvidence.modality === 'audio' && selectedEvidence.dialogueUtterance && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                      Acoustic Waveform &amp; Diarized Speaker Turn (Whisper + PyAnnote)
                    </h4>

                    {/* Waveform Player */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 flex items-center gap-4">
                      <button
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Volume2 className={`w-5 h-5 ${isPlayingAudio ? 'animate-bounce text-cyan-400' : ''}`} />
                      </button>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400 font-mono">
                          <span className="text-cyan-400 font-bold">{selectedEvidence.dialogueUtterance.speaker}</span>
                          <span>[{selectedEvidence.dialogueUtterance.startTime}s - {selectedEvidence.dialogueUtterance.endTime}s]</span>
                        </div>
                        {/* Animated waveform bars */}
                        <div className="flex items-center gap-1 h-9 px-2 bg-slate-900 rounded-lg overflow-hidden">
                          {Array.from({ length: 44 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all duration-300 ${
                                isPlayingAudio ? 'bg-cyan-400 animate-wave-1' : 'bg-purple-500/70'
                              }`}
                              style={{
                                height: `${Math.max(15, (Math.cos(i * 0.45) * 0.5 + 0.5) * 85)}%`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dialogue Utterance */}
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-2">
                      <p className="text-purple-100 leading-relaxed font-sans text-sm">
                        "{selectedEvidence.dialogueUtterance.text}"
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-purple-500/20">
                        <span>Speaker Sentiment: <strong className="text-emerald-400 uppercase">{selectedEvidence.dialogueUtterance.sentiment || 'Positive'}</strong></span>
                        <span className="font-mono">ASR Confidence: {(selectedEvidence.dialogueUtterance.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedEvidence.modality === 'text' && selectedEvidence.textSnippet && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Document Text Span &amp; Page Attribution
                    </h4>
                    <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-2">
                      <p className="text-slate-200 leading-relaxed font-mono bg-slate-900/80 p-3 rounded border border-white/5">
                        "{selectedEvidence.textSnippet}"
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Page Reference: <strong className="text-purple-300 font-mono">Page {selectedEvidence.pageNumber || 1}</strong></span>
                        <span className="text-emerald-400 font-mono font-bold">100% Textual Provenance</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grounding Verification Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block mb-1">Cross-Modal Alignment</span>
                    <strong className="text-cyan-400 font-mono text-sm">{(selectedEvidence.alignmentScore * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block mb-1">ASR / OCR Confidence</span>
                    <strong className="text-emerald-400 font-mono text-sm">{selectedEvidence.asrOcrConfidence == null ? 'n/a' : `${(selectedEvidence.asrOcrConfidence * 100).toFixed(1)}%`}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block mb-1">Triplet Consistency</span>
                    <strong className="text-purple-400 font-mono text-sm">{(selectedEvidence.crossModalConsistency * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-16 text-center text-slate-500">Select an evidence item on the left to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
};
