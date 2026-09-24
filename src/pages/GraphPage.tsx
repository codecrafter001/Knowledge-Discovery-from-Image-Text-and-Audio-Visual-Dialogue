import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { GraphData, GraphNode } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ModalityBadge } from '../components/common/Badge';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Play,
  Pause,
  Compass,
  Eye,
  Info
} from 'lucide-react';

export const GraphPage: React.FC = () => {
  const { selectedEntity, setSelectedEntity, setCurrentPage } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);

  // Path finder state
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [highlightedPathNodes, setHighlightedPathNodes] = useState<string[]>([]);

  // Canvas transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<GraphNode | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      const data = await api.getGraphData();
      // Initialize positions clustered around center
      const width = 800;
      const height = 550;
      const initializedNodes = data.nodes.map((node, i) => {
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        const radius = 180 + (Math.random() * 80 - 40);
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      });
      setGraphData({ nodes: initializedNodes, links: data.links });

      if (selectedEntity) {
        const match = initializedNodes.find(n => n.id === selectedEntity.id);
        if (match) setSelectedNode(match);
      } else if (initializedNodes.length > 0) {
        setSelectedNode(initializedNodes[0]);
      }
    };
    fetchGraph();
  }, [selectedEntity]);

  // Render canvas
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const { nodes, links } = graphData;

    // Draw Links
    for (const link of links) {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const sNode = nodes.find(n => n.id === sourceId);
      const tNode = nodes.find(n => n.id === targetId);

      if (sNode && tNode && sNode.x && sNode.y && tNode.x && tNode.y) {
        const isPath =
          highlightedPathNodes.includes(sNode.id) && highlightedPathNodes.includes(tNode.id);
        const isConnectedToSelected =
          selectedNode && (sNode.id === selectedNode.id || tNode.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(sNode.x, sNode.y);
        ctx.lineTo(tNode.x, tNode.y);

        if (isPath) {
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
        } else if (isConnectedToSelected) {
          ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();

        // Edge Predicate Label
        const midX = (sNode.x + tNode.x) / 2;
        const midY = (sNode.y + tNode.y) / 2;

        if (isConnectedToSelected || isPath || transform.scale > 1.2) {
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = isPath ? '#00f2fe' : 'rgba(203, 213, 225, 0.8)';
          ctx.textAlign = 'center';
          ctx.fillText(link.predicate, midX, midY - 4);
        }
      }
    }

    // Draw Nodes
    for (const node of nodes) {
      if (!node.x || !node.y) continue;

      const isSelected = selectedNode?.id === node.id;
      const isPath = highlightedPathNodes.includes(node.id);
      const radius = node.val || 16;

      // Glow halo for selected/path node
      if (isSelected || isPath) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, 2 * Math.PI);
        ctx.fillStyle = isPath ? 'rgba(0, 242, 254, 0.25)' : 'rgba(127, 0, 255, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = isPath ? '#00f2fe' : '#7f00ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color || '#00f2fe';
      ctx.fill();
      ctx.strokeStyle = '#06090e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Node Label
      ctx.font = `${isSelected ? 'bold 11px' : '10px'} Inter, sans-serif`;
      ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, node.y + radius + 14);

      // Node Category Tag
      ctx.font = '8px Inter, sans-serif';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.fillText(node.category, node.x, node.y + radius + 24);
    }

    ctx.restore();
  }, [graphData, transform, selectedNode, highlightedPathNodes]);

  // Force simulation loop
  useEffect(() => {
    if (!isSimulating || graphData.nodes.length === 0) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width || 800;
    const height = canvas.height || 550;

    const tick = () => {
      const { nodes, links } = graphData;

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          if (!n1.x || !n1.y || !n2.x || !n2.y) continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 120;

          if (dist < 280) {
            const force = (minDist - dist) / dist * 0.08;
            if (n1 !== draggedNode.current) {
              n1.vx = (n1.vx || 0) - dx * force;
              n1.vy = (n1.vy || 0) - dy * force;
            }
            if (n2 !== draggedNode.current) {
              n2.vx = (n2.vx || 0) + dx * force;
              n2.vy = (n2.vy || 0) + dy * force;
            }
          }
        }
      }

      // Spring attraction along links
      for (const link of links) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const sNode = nodes.find(n => n.id === sourceId);
        const tNode = nodes.find(n => n.id === targetId);

        if (sNode && tNode && sNode.x && sNode.y && tNode.x && tNode.y) {
          const dx = tNode.x - sNode.x;
          const dy = tNode.y - sNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 140;
          const force = (dist - desiredDist) * 0.005;

          if (sNode !== draggedNode.current) {
            sNode.vx = (sNode.vx || 0) + dx * force;
            sNode.vy = (sNode.vy || 0) + dy * force;
          }
          if (tNode !== draggedNode.current) {
            tNode.vx = (tNode.vx || 0) - dx * force;
            tNode.vy = (tNode.vy || 0) - dy * force;
          }
        }
      }

      // Center gravity & damping
      const centerX = width / 2;
      const centerY = height / 2;
      for (const node of nodes) {
        if (node === draggedNode.current || !node.x || !node.y) continue;
        const cdx = centerX - node.x;
        const cdy = centerY - node.y;
        node.vx = ((node.vx || 0) + cdx * 0.001) * 0.88;
        node.vy = ((node.vy || 0) + cdy * 0.001) * 0.88;
        node.x += node.vx;
        node.y += node.vy;
      }

      drawGraph();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, graphData, drawGraph]);

  // Mouse drag & select handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;

    // Check if clicked a node
    for (const node of graphData.nodes) {
      if (!node.x || !node.y) continue;
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= (node.val || 16) + 6) {
        draggedNode.current = node;
        setSelectedNode(node);
        setSelectedEntity(node.entity);
        return;
      }
    }

    // Pan canvas
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (draggedNode.current) {
      const rect = canvas.getBoundingClientRect();
      draggedNode.current.x = (e.clientX - rect.left - transform.x) / transform.scale;
      draggedNode.current.y = (e.clientY - rect.top - transform.y) / transform.scale;
      drawGraph();
    } else if (isDragging.current) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    }
  };

  const handleMouseUp = () => {
    draggedNode.current = null;
    isDragging.current = false;
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(2.5, Math.max(0.4, prev.scale + delta))
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Execute Subgraph Path Finder
  const handleFindPath = () => {
    if (!pathSource || !pathTarget) return;
    setHighlightedPathNodes([pathSource, pathTarget]);
  };

  // Search filter
  const handleSearchNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = graphData.nodes.find(n =>
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (match) {
      setSelectedNode(match);
      setSelectedEntity(match.entity);
      if (match.x && match.y) {
        setTransform({
          x: 400 - match.x,
          y: 275 - match.y,
          scale: 1.2
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Multimodal Knowledge Graph</h2>
            <p className="text-xs text-slate-400">
              {graphData.nodes.length} Vertices • {graphData.links.length} Semantic Edges
            </p>
          </div>
        </div>

        {/* Node Search Bar */}
        <form onSubmit={handleSearchNode} className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find entity in graph..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <Button type="submit" variant="glass" size="sm">
            Locate
          </Button>
        </form>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Canvas Graph (3 cols) */}
        <div className="lg:col-span-3 relative rounded-2xl overflow-hidden border border-white/10 bg-[#05080f] shadow-2xl min-h-[550px]">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={900}
            height={580}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-[580px] cursor-grab active:cursor-grabbing block"
          />

          {/* Floating Graph Controls */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-lg text-slate-300">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`p-2 rounded-lg transition-colors ${isSimulating ? 'text-cyan-400 bg-cyan-500/10' : 'hover:text-cyan-400'}`}
              title={isSimulating ? 'Pause Physics' : 'Resume Physics'}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>

          {/* Path Finder Sub-bar */}
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 text-xs shadow-xl">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Path Finder:
            </span>
            <select
              value={pathSource}
              onChange={(e) => setPathSource(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded p-1 text-slate-200 focus:outline-none text-xs"
            >
              <option value="">Source Entity</option>
              {graphData.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
            <span className="text-slate-500">──▶</span>
            <select
              value={pathTarget}
              onChange={(e) => setPathTarget(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded p-1 text-slate-200 focus:outline-none text-xs"
            >
              <option value="">Target Entity</option>
              {graphData.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
            <Button variant="primary" size="sm" onClick={handleFindPath}>
              Trace Path
            </Button>
          </div>
        </div>

        {/* Node & Neighbors Detail Drawer (1 col) */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader
              title={selectedNode ? selectedNode.name : 'Node Inspector'}
              subtitle={selectedNode ? `Category: ${selectedNode.category}` : 'Select a node in the graph'}
              icon={<Info className="w-4 h-4 text-cyan-400" />}
            />
            <CardContent className="space-y-4 text-xs">
              {selectedNode ? (
                <>
                  <div>
                    <span className="text-slate-400 block mb-1">Entity Description</span>
                    <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      {selectedNode.entity.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400">Modality Origins:</span>
                    <div className="flex gap-1">
                      {selectedNode.entity.modalityOrigins.map(m => (
                        <ModalityBadge key={m} modality={m} size="sm" />
                      ))}
                    </div>
                  </div>

                  {/* Connected Neighbors */}
                  <div>
                    <span className="text-slate-400 block mb-2 font-semibold">
                      Connected Relational Edges
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {graphData.links
                        .filter(l => {
                          const s = typeof l.source === 'object' ? l.source.id : l.source;
                          const t = typeof l.target === 'object' ? l.target.id : l.target;
                          return s === selectedNode.id || t === selectedNode.id;
                        })
                        .map((l) => (
                          <div
                            key={l.id}
                            className="p-2 rounded-lg bg-slate-950/50 border border-white/5 text-[11px] font-mono flex items-center justify-between"
                          >
                            <span className="text-cyan-300 font-bold">[{l.predicate}]</span>
                            <span className="text-emerald-400">{(l.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setCurrentPage('evidence')}
                    >
                      Inspect Source Evidence
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      className="w-full"
                      onClick={() => setCurrentPage('explorer')}
                    >
                      View in Entity Catalog
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Click any vertex on the graph to inspect its neighbors.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
