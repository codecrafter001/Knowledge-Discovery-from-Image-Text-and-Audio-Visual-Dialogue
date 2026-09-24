import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Modality, IngestedDocument, IngestionStatus } from '../types';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ProgressBar } from '../components/common/ProgressBar';
import { ModalityBadge } from '../components/common/Badge';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  Sparkles,
  CheckCircle2,
  Sliders,
  Play,
  Cpu,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

const LIVE_POLL_INTERVAL_MS = 1000;

const LIVE_STAGE_LABELS: Record<IngestionStatus, string> = {
  queued: 'Queued for processing...',
  preprocessing: 'Preprocessing & decoding...',
  extracting: 'Extracting entities & relations...',
  embedding: 'Computing embeddings...',
  graph_linking: 'Linking into knowledge graph...',
  completed: 'Pipeline Ingestion Completed.',
  failed: 'Pipeline Ingestion Failed.'
};

export const UploadPage: React.FC = () => {
  const { addNotification, setCurrentPage, setSelectedDocument } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModality, setSelectedModality] = useState<Modality>('multimodal');
  const [domain, setDomain] = useState('Planetary Science & Robotics');
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [enableBoundingBoxes, setEnableBoundingBoxes] = useState(true);
  const [selectedModel, setSelectedModel] = useState('qwen2.5-vl-72b');

  // Ingestion state
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionStage, setIngestionStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [completedDoc, setCompletedDoc] = useState<IngestedDocument | null>(null);

  const samplePresets = [
    {
      name: 'NASA Mars Rover Delta Mastcam',
      modality: 'image' as Modality,
      domain: 'Planetary Science & Robotics',
      filename: 'perseverance_delta_sample_09.tiff',
      size: '5.2 MB',
      thumbnail: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80',
      summary: 'Multispectral image capturing clay mineral layers and rover arm sampling zone in Jezero crater delta.'
    },
    {
      name: 'Superconducting Qubits Panel Dialogue',
      modality: 'audio' as Modality,
      domain: 'Quantum Computing',
      filename: 'quantum_symposium_panel_04.wav',
      size: '22.1 MB',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
      summary: 'Synchronized acoustic dialogue with speaker diarization evaluating transmon decoherence reduction.'
    },
    {
      name: 'Oncological Multimodal Fusion Report',
      modality: 'text' as Modality,
      domain: 'Bio-Medical & Oncology',
      filename: 'pathology_genomics_fusion_paper.pdf',
      size: '4.1 MB',
      thumbnail: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
      summary: 'Histopathology whole-slide findings aligned with whole-genome sequencing biomarker mutation markers.'
    }
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'tiff', 'webp'].includes(ext || '')) {
      setSelectedModality('image');
    } else if (['mp3', 'wav', 'flac', 'm4a'].includes(ext || '')) {
      setSelectedModality('audio');
    } else if (['mp4', 'mkv', 'webm', 'mov'].includes(ext || '')) {
      setSelectedModality('video');
    } else if (['pdf', 'txt', 'docx', 'json'].includes(ext || '')) {
      setSelectedModality('text');
    } else {
      setSelectedModality('multimodal');
    }
    setCompletedDoc(null);
  };

  const loadPreset = (preset: typeof samplePresets[0]) => {
    setSelectedFile(new File(['mock content'], preset.filename, { type: 'application/octet-stream' }));
    setSelectedModality(preset.modality);
    setDomain(preset.domain);
    setCompletedDoc(null);
    addNotification('info', `Loaded preset template: ${preset.name}`);
  };

  const startLiveIngestion = async (file: File) => {
    setIsIngesting(true);
    setProgress(5);
    setIngestionStage('Uploading file...');
    try {
      let doc = await api.uploadDocument({
        title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        filename: file.name,
        modality: selectedModality,
        domain: domain
      }, file);

      while (doc.status !== 'completed' && doc.status !== 'failed') {
        setProgress(Math.max(doc.progress, 5));
        setIngestionStage(LIVE_STAGE_LABELS[doc.status]);
        await new Promise(r => setTimeout(r, LIVE_POLL_INTERVAL_MS));
        doc = await api.getDocument(doc.id);
      }

      if (doc.status === 'failed') {
        setIngestionStage('Pipeline Ingestion Failed.');
        addNotification('error', doc.summary || `Ingestion failed: ${doc.title}`);
        return;
      }
      setProgress(100);
      setIngestionStage('Pipeline Ingestion Completed.');
      setCompletedDoc(doc);
      addNotification('success', `Processed & indexed: ${doc.title} (${doc.tripletCount} triplets)`);
    } catch (err) {
      addNotification('error', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsIngesting(false);
    }
  };

  const startIngestion = async () => {
    if (!selectedFile) return;
    if (!api.getMockMode()) return startLiveIngestion(selectedFile);

    setIsIngesting(true);
    setProgress(5);
    setIngestionStage('Preprocessing & Frame/Audio Decoding...');

    // Simulate multi-stage pipeline progression
    await new Promise(r => setTimeout(r, 600));
    setProgress(32);
    setIngestionStage('Extracting Dense Multimodal Embeddings (EVA-02 & Whisper)...');

    await new Promise(r => setTimeout(r, 700));
    setProgress(65);
    setIngestionStage('Cross-Modal Alignment & Coreference Grounding...');

    await new Promise(r => setTimeout(r, 600));
    setProgress(88);
    setIngestionStage('Synthesizing Relational Triplets & Graph Indexing...');

    await new Promise(r => setTimeout(r, 500));
    setProgress(100);
    setIngestionStage('Pipeline Ingestion Completed.');

    try {
      const created = await api.uploadDocument({
        title: selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase(),
        filename: selectedFile.name,
        modality: selectedModality,
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        domain: domain,
        summary: `Multimodal asset ingested and verified across ${selectedModality} extraction pipeline.`,
        thumbnailUrl: selectedModality === 'image'
          ? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'
          : undefined
      }, selectedFile);

      setCompletedDoc(created);
      addNotification('success', `Successfully processed & indexed: ${created.title}`);
    } catch {
      addNotification('error', 'Ingestion failed during graph synchronization.');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Presets Strip */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#0c1424]">
        <CardHeader
          title="Quick Multimodal Demonstration Presets"
          subtitle="One-click test sample assets pre-configured for instant discovery"
          icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {samplePresets.map((preset, i) => (
              <div
                key={i}
                onClick={() => loadPreset(preset)}
                className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/90 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-12 h-12 rounded-lg bg-slate-700/60 overflow-hidden shrink-0 border border-white/10">
                  <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ModalityBadge modality={preset.modality} size="sm" />
                    <span className="text-[10px] text-slate-400 font-mono">{preset.size}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 truncate">
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{preset.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Upload Zone + Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Multimodal Asset Ingestion"
              subtitle="Drop PDFs, high-res images, audio WAVs, or video dialogues"
              icon={<UploadCloud className="w-4 h-4" />}
            />
            <CardContent className="space-y-6">
              {/* Drag and drop box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 bg-slate-950/40 hover:bg-cyan-950/10 rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group flex flex-col items-center justify-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.json,.png,.jpg,.jpeg,.tiff,.webp,.mp3,.wav,.flac,.mp4,.mkv,.webm"
                />

                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h4 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {selectedFile ? selectedFile.name : 'Choose a file or drag & drop here'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1">
                  Supports Multimodal Formats: PDF, PNG/TIFF, WAV/MP3, MP4 video
                </p>

                {selectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                )}
              </div>

              {/* Ingestion Progress or Start Trigger */}
              {isIngesting ? (
                <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="font-semibold text-cyan-300">{ingestionStage}</span>
                    </div>
                    <span className="font-mono text-slate-300">{progress}%</span>
                  </div>
                  <ProgressBar progress={progress} color="cyan" height="md" />
                  <p className="text-[11px] text-slate-400 font-mono">
                    Extracting tokens &gt; Synchronizing knowledge graph triplets &gt; Neo4j
                  </p>
                </div>
              ) : completedDoc ? (
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-300">Ingestion Complete &amp; Verified</h4>
                        <p className="text-xs text-slate-300 mt-0.5">{completedDoc.title}</p>
                      </div>
                    </div>
                    <ModalityBadge modality={completedDoc.modality} size="sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 border-y border-emerald-500/20">
                    <div>
                      <span className="text-slate-400 block">Entities Found</span>
                      <strong className="text-white font-mono text-sm">{completedDoc.entityCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Relations</span>
                      <strong className="text-cyan-400 font-mono text-sm">{completedDoc.relationCount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Triplets Synced</span>
                      <strong className="text-emerald-400 font-mono text-sm">{completedDoc.tripletCount}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<ArrowRight className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedDocument(completedDoc);
                        setCurrentPage('documents');
                      }}
                    >
                      View Ingested Document
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => setCurrentPage('graph')}
                    >
                      Explore in Knowledge Graph
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!selectedFile}
                    icon={<Play className="w-4 h-4" />}
                    onClick={startIngestion}
                  >
                    Execute Ingestion Pipeline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Sidebar (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Pipeline Configuration"
              subtitle="Multimodal extraction hyperparameters"
              icon={<Sliders className="w-4 h-4" />}
            />
            <CardContent className="space-y-4 text-xs">
              {/* Modality Override */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Asset Modality</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'multimodal', label: 'Cross-Modal', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: 'image', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                    { id: 'audio', label: 'Audio', icon: <Mic className="w-3.5 h-3.5" /> },
                    { id: 'video', label: 'Video', icon: <Video className="w-3.5 h-3.5" /> },
                    { id: 'text', label: 'Text/PDF', icon: <FileText className="w-3.5 h-3.5" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModality(m.id as Modality)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-colors ${
                        selectedModality === m.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Domain */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Domain Ontology</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                >
                  <option>Planetary Science &amp; Robotics</option>
                  <option>Quantum Computing &amp; Superconductors</option>
                  <option>Bio-Medical &amp; Clinical Oncology</option>
                  <option>Autonomous Vehicles &amp; AV Dialogue</option>
                  <option>Geospatial &amp; Climate Intelligence</option>
                </select>
              </div>

              {/* Foundation Model Engine */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Extraction LLM / VLM</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                >
                  <option value="qwen2.5-vl-72b">Qwen2.5-VL 72B (Grounding &amp; Spatial)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast Cross-modal)</option>
                  <option value="eva02-clip-large">EVA-02-CLIP + Whisper-Turbo</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Speaker Diarization (PyAnnote)</span>
                  <input
                    type="checkbox"
                    checked={enableDiarization}
                    onChange={(e) => setEnableDiarization(e.target.checked)}
                    className="rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Visual Bounding Boxes (SAM-2)</span>
                  <input
                    type="checkbox"
                    checked={enableBoundingBoxes}
                    onChange={(e) => setEnableBoundingBoxes(e.target.checked)}
                    className="rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-400"
                  />
                </label>
              </div>

              {/* Model Spec Callout */}
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-start gap-2">
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Zero-shot Triplet OpenIE maps raw multimodal embeddings directly to Subject-Predicate-Object schemas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
