import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Entity, Relation, Triplet } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Layers,
  Share2,
  GitCommit,
  Search,
  Eye,
  Filter
} from 'lucide-react';

export const ExplorerPage: React.FC = () => {
  const {
    selectedEntity,
    setSelectedEntity,
    inspectEntityInGraph,
    inspectEvidenceForTriplet
  } = useApp();

  const [activeTab, setActiveTab] = useState<'entities' | 'relations' | 'triplets'>('entities');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ents, rels, trips] = await Promise.all([
          api.getEntities(),
          api.getRelations(),
          api.getTriplets()
        ]);
        setEntities(ents);
        setRelations(rels);
        setTriplets(trips);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categories = ['All', 'Concept', 'Technology', 'Person', 'Visual Object', 'Location'];

  const filteredEntities = entities.filter(ent => {
    const matchesCat = categoryFilter === 'All' || ent.category === categoryFilter;
    const matchesSearch = ent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredTriplets = triplets.filter(trip => {
    return trip.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           trip.predicate.toLowerCase().includes(searchQuery.toLowerCase()) ||
           trip.objectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           trip.sourceDocTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'entities'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Entities Catalog ({entities.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'relations'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCommit className="w-4 h-4" />
            <span>Relation Types ({relations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('triplets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'triplets'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Verified Triplets ({triplets.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Tab 1: Entities Catalog */}
      {activeTab === 'entities' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Entity Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Loading entities...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntities.map((ent) => (
                <Card
                  key={ent.id}
                  hoverEffect={true}
                  onClick={() => setSelectedEntity(ent)}
                  className="p-5 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={{
                          backgroundColor: `${ent.color || '#00f2fe'}15`,
                          borderColor: `${ent.color || '#00f2fe'}40`,
                          color: ent.color || '#00f2fe'
                        }}
                      >
                        {ent.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Freq: {ent.frequency}</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {ent.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {ent.description}
                    </p>

                    {/* Modality origins */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {ent.modalityOrigins.map((m) => (
                        <ModalityBadge key={m} modality={m} size="sm" />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Confidence: <strong className="text-emerald-400 font-mono">{(ent.confidence * 100).toFixed(0)}%</strong>
                    </span>

                    <Button
                      variant="glass"
                      size="sm"
                      icon={<Share2 className="w-3.5 h-3.5 text-cyan-400" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        inspectEntityInGraph(ent);
                      }}
                    >
                      In Graph
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Relations Matrix */}
      {activeTab === 'relations' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Relation Predicate</th>
                  <th className="py-3.5 px-4">Relational Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Occurrences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {relations.map((rel) => (
                  <tr key={rel.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      {rel.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs">
                        {rel.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 max-w-md">{rel.description}</td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{rel.count} links</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Verified Triplets */}
      {activeTab === 'triplets' && (
        <div className="space-y-3">
          {filteredTriplets.map((trip) => (
            <Card key={trip.id} className="p-4 sm:p-5 hover:border-cyan-500/30 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModalityBadge modality={trip.modality} size="sm" />
                    <span className="text-xs text-slate-400 font-mono">
                      Source: <strong className="text-slate-300">{trip.sourceDocTitle}</strong>
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      Score: {(trip.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Triplet flow */}
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                      {trip.subjectName}
                    </span>
                    <span className="text-xs font-mono text-purple-400 bg-purple-950/40 px-2 py-1 rounded border border-purple-500/30">
                      ──[{trip.predicate}]──▶
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                      {trip.objectName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded border border-white/5">
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
                    View Provenance
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Entity Details Modal */}
      {selectedEntity && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEntity(null)}
          title={selectedEntity.name}
          subtitle={`Category: ${selectedEntity.category}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Description</label>
              <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-white/5">
                {selectedEntity.description}
              </p>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Associated Aliases</label>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntity.aliases.map((alias, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-slate-800 text-slate-300 border border-white/10 font-mono">
                    {alias}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Extracted Entity Attributes</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selectedEntity.attributes).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded bg-slate-950/50 border border-white/5">
                    <span className="text-slate-400 block">{key}</span>
                    <strong className="text-cyan-300 font-mono">{val}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Share2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  inspectEntityInGraph(selectedEntity);
                  setSelectedEntity(null);
                }}
              >
                Inspect in Knowledge Graph
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
