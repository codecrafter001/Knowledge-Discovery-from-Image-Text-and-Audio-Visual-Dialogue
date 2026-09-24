import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { IngestedDocument, Modality } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Grid,
  List,
  Eye,
  Share2,
  Calendar,
  Volume2
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { selectedDocument, setSelectedDocument, setCurrentPage } = useApp();
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState<Modality | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeUtteranceIndex, setActiveUtteranceIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const data = await api.getDocuments();
        setDocuments(data);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    const matchesModality = selectedModality === 'all' || doc.modality === selectedModality;
    const matchesQuery =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModality && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents by title, domain, or concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          />
        </div>

        {/* Filters and View toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Modality Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs">
            {(['all', 'image', 'audio', 'text', 'video'] as const).map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModality(mod)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${
                  selectedModality === mod
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>

          {/* Grid/Table Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'hover:text-white'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading document artifacts...</div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          title="No Matching Documents Found"
          description="Try adjusting your modality filter or search keywords to discover ingested assets."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedModality('all');
          }}
          icon="search"
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              hoverEffect={true}
              onClick={() => setSelectedDocument(doc)}
              className="flex flex-col h-full overflow-hidden group cursor-pointer"
            >
              {/* Thumbnail / Header Preview */}
              <div className="relative h-44 bg-slate-800/80 overflow-hidden border-b border-white/10">
                {doc.thumbnailUrl ? (
                  <img
                    src={doc.thumbnailUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-[#0e1626] p-4 text-center">
                    <ModalityBadge modality={doc.modality} size="lg" />
                    <span className="text-xs text-slate-400 font-mono mt-3">{doc.filename}</span>
                  </div>
                )}

                {/* Overlaid Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <ModalityBadge modality={doc.modality} size="sm" />
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge status={doc.status} />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{doc.uploadedAt}</span>
                    <span>•</span>
                    <span>{doc.fileSize}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {doc.summary}
                  </p>
                </div>

                {/* Meta Counts & Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span title="Extracted Entities">
                      <strong className="text-cyan-400">{doc.entityCount}</strong> ents
                    </span>
                    <span title="Verified Triplets">
                      <strong className="text-purple-400">{doc.tripletCount}</strong> trips
                    </span>
                  </div>

                  <Button
                    variant="glass"
                    size="sm"
                    icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDocument(doc);
                    }}
                  >
                    Inspect
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Artifact Title</th>
                  <th className="py-3.5 px-4">Modality</th>
                  <th className="py-3.5 px-4">Domain</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">Entities / Triplets</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 min-w-[240px]">
                      <div className="font-semibold text-slate-100 hover:text-cyan-300 transition-colors">
                        {doc.title}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{doc.filename}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <ModalityBadge modality={doc.modality} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">{doc.domain}</td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span className="text-emerald-400 font-bold">{(doc.confidenceScore * 100).toFixed(1)}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      <span className="text-cyan-400">{doc.entityCount} ents</span> / <span className="text-purple-400">{doc.tripletCount} trips</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="glass"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Deep Document Inspection Modal */}
      {selectedDocument && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDocument(null)}
          title={selectedDocument.title}
          subtitle={`Modality: ${selectedDocument.modality.toUpperCase()} • Domain: ${selectedDocument.domain}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Visual Inspection Preview for Image or Video */}
            {(selectedDocument.modality === 'image' || selectedDocument.modality === 'video') && (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[420px]">
                {selectedDocument.contentUrl || selectedDocument.thumbnailUrl ? (
                  <img
                    src={selectedDocument.contentUrl || selectedDocument.thumbnailUrl}
                    alt={selectedDocument.title}
                    className="w-full h-full object-contain max-h-[420px]"
                  />
                ) : (
                  <div className="text-slate-500 text-sm">Media preview unavailable</div>
                )}

                {/* Interactive Bounding Boxes Overlay */}
                {selectedDocument.boundingBoxes?.map((box) => (
                  <div
                    key={box.id}
                    className="absolute border-2 rounded transition-all duration-200 group/box cursor-pointer"
                    style={{
                      borderColor: box.color,
                      backgroundColor: `${box.color}20`,
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                  >
                    <div
                      className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 whitespace-nowrap shadow-md"
                      style={{ backgroundColor: box.color }}
                    >
                      {box.label} ({(box.confidence * 100).toFixed(0)}%)
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Audio Waveform & Diarized Dialogue Section */}
            {selectedDocument.modality === 'audio' && (
              <div className="space-y-4">
                {/* Simulated Audio Player Bar */}
                <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>48.0 kHz 24-bit Stereo</span>
                      <span className="font-mono">04:05 Duration</span>
                    </div>
                    {/* Simulated Waveform Visualizer */}
                    <div className="flex items-center gap-1 h-8 px-2 bg-slate-950/60 rounded-lg overflow-hidden">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-purple-500/60 rounded-full"
                          style={{
                            height: `${Math.max(15, (Math.sin(i * 0.4) * 0.5 + 0.5) * 85)}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Diarized Dialogue Transcript */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Diarized Speaker Turns ({selectedDocument.dialogueUtterances?.length || 0})
                  </h4>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedDocument.dialogueUtterances?.map((utt, i) => (
                      <div
                        key={utt.id}
                        onClick={() => setActiveUtteranceIndex(i)}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer text-xs ${
                          activeUtteranceIndex === i
                            ? 'bg-purple-950/30 border-purple-500/60 text-purple-200'
                            : 'bg-slate-900/60 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-cyan-400">{utt.speaker}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            [{utt.startTime}s - {utt.endTime}s]
                          </span>
                        </div>
                        <p className="leading-relaxed">{utt.text}</p>
                        {utt.extractedEntities && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {utt.extractedEntities.map((e, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-mono">
                                #{e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Text Document Section */}
            {selectedDocument.modality === 'text' && selectedDocument.textContent && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 text-xs leading-relaxed text-slate-200 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
                {selectedDocument.textContent}
              </div>
            )}

            {/* Bounding Box List if available */}
            {selectedDocument.boundingBoxes && selectedDocument.boundingBoxes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Detected Spatial Bounding Boxes ({selectedDocument.boundingBoxes.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedDocument.boundingBoxes.map((box) => (
                    <div
                      key={box.id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-white/10 flex flex-col justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: box.color }} />
                        <span className="font-semibold text-slate-200 truncate">{box.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Conf: {(box.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Grounding Engine: <strong className="text-cyan-400">{selectedDocument.metadata.nlpModel || selectedDocument.metadata.embeddingModel || 'n/a'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  icon={<Share2 className="w-4 h-4 text-cyan-400" />}
                  onClick={() => {
                    setSelectedDocument(null);
                    setCurrentPage('graph');
                  }}
                >
                  View Connected Graph
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedDocument(null);
                    setCurrentPage('evidence');
                  }}
                >
                  Inspect Grounded Evidence
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
