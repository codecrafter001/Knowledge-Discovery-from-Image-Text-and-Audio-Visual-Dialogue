import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  Settings,
  Server,
  Cpu,
  Download,
  RefreshCw,
  Sparkles,
  Database,
  Wifi,
  WifiOff,
  Code
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, apiStatus, apiLatency, checkApiHealth, addNotification } = useApp();

  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [useMockBackend, setUseMockBackend] = useState(settings.useMockBackend);
  const [llmModel, setLlmModel] = useState(settings.llmModel);
  const [vlmModel, setVlmModel] = useState(settings.vlmModel);
  const [asrModel, setAsrModel] = useState(settings.asrModel);
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.similarityThreshold);
  const [autoLinkThreshold, setAutoLinkThreshold] = useState(settings.autoLinkThreshold);

  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const handleSaveSettings = () => {
    setIsSaving(true);
    updateSettings({
      apiBaseUrl,
      useMockBackend,
      llmModel,
      vlmModel,
      asrModel,
      similarityThreshold,
      autoLinkThreshold,
    });
    setTimeout(() => {
      setIsSaving(false);
      addNotification('success', 'System configurations saved successfully.');
    }, 400);
  };

  const handlePingBackend = async () => {
    setIsPinging(true);
    await checkApiHealth();
    setIsPinging(false);
    addNotification('info', `Backend status ping completed (${apiStatus}).`);
  };

  const handleExport = (format: 'json' | 'rdf' | 'cypher' | 'csv') => {
    const dataStr = `data:text/json;charset=utf-8,` + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `knowledge_discovery_export.${format === 'rdf' ? 'ttl' : format === 'cypher' ? 'cql' : format}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addNotification('success', `Exported knowledge base in ${format.toUpperCase()} format.`);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">System, API &amp; Model Configurations</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure FastAPI endpoints, foundation models, cross-modal thresholds, and export tools
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={handleSaveSettings}
        >
          Save Changes
        </Button>
      </div>

      {/* Backend API Configuration */}
      <Card>
        <CardHeader
          title="FastAPI Backend Integration"
          subtitle="Configure REST/WebSocket API endpoints and fallback behavior"
          icon={<Server className="w-4 h-4 text-cyan-400" />}
          action={
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : useMockBackend
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {apiStatus === 'online' ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    FastAPI Live ({apiLatency}ms)
                  </>
                ) : useMockBackend ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Mock Neural Mode
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    Offline
                  </>
                )}
              </span>
            </div>
          }
        />
        <CardContent className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              API Base URL (from <code className="text-cyan-400 font-mono">VITE_API_BASE_URL</code>)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="http://localhost:8000/api/v1"
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg p-2.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
              <Button
                variant="glass"
                size="sm"
                loading={isPinging}
                icon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
                onClick={handlePingBackend}
              >
                Ping
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Connect to your local or remote FastAPI microservice exposing <code className="text-slate-400">/documents</code>, <code className="text-slate-400">/query</code>, and <code className="text-slate-400">/graph</code>.
            </p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-semibold block">High-Fidelity Mock Engine Fallback</span>
              <p className="text-slate-400 text-[11px]">
                Enables simulated multimodal dataset, bounding boxes, audio waveforms &amp; vector reasoning.
              </p>
            </div>
            <input
              type="checkbox"
              checked={useMockBackend}
              onChange={(e) => setUseMockBackend(e.target.checked)}
              className="rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-400 h-4 w-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Model & Hyperparameter Settings */}
      <Card>
        <CardHeader
          title="Foundation Model Engines &amp; Thresholds"
          subtitle="Model hyperparameters for extraction, diarization and vector alignment"
          icon={<Cpu className="w-4 h-4 text-purple-400" />}
        />
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Reasoning LLM</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none font-mono text-xs"
              >
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Fast Cross-Modal)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o">GPT-4o Multimodal</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Vision-Language VLM</label>
              <select
                value={vlmModel}
                onChange={(e) => setVlmModel(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none font-mono text-xs"
              >
                <option value="qwen2.5-vl-72b">Qwen2.5-VL 72B Grounding</option>
                <option value="eva02-clip-large">EVA-02-CLIP Large</option>
                <option value="dinov2-giant">DINOv2 Giant</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Audio ASR &amp; Diarization</label>
              <select
                value={asrModel}
                onChange={(e) => setAsrModel(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none font-mono text-xs"
              >
                <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo</option>
                <option value="wavlm-large-semantic">WavLM Large Semantic</option>
                <option value="pyannote-diarization-3">PyAnnote Diarization v3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5">
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Semantic Similarity Threshold:</span>
                <strong className="text-cyan-400">{(similarityThreshold * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.01"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-900 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Graph Auto-linking Threshold:</span>
                <strong className="text-purple-400">{(autoLinkThreshold * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.01"
                value={autoLinkThreshold}
                onChange={(e) => setAutoLinkThreshold(parseFloat(e.target.value))}
                className="w-full accent-purple-400 bg-slate-900 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base Export */}
      <Card>
        <CardHeader
          title="Knowledge Graph &amp; Triplet Export"
          subtitle="Export discovered entities, relational edges and citations to standard formats"
          icon={<Download className="w-4 h-4 text-emerald-400" />}
        />
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<Code className="w-3.5 h-3.5 text-cyan-400" />}
              onClick={() => handleExport('json')}
            >
              JSON Graph (.json)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Database className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => handleExport('rdf')}
            >
              RDF Turtle (.ttl)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Server className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => handleExport('cypher')}
            >
              Neo4j Cypher (.cql)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-amber-400" />}
              onClick={() => handleExport('csv')}
            >
              Triplets CSV (.csv)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
