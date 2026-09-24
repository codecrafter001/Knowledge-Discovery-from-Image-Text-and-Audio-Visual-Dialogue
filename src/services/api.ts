import type {
  IngestedDocument,
  Entity,
  Relation,
  Triplet,
  GraphData,
  PipelineStage,
  PipelineLog,
  EvidenceItem,
  EvaluationMetricCard,
  ModalityBenchmark,
  SearchQueryResponse,
  Modality
} from '../types';
import {
  MOCK_DOCUMENTS,
  MOCK_ENTITIES,
  MOCK_RELATIONS,
  MOCK_TRIPLETS,
  MOCK_GRAPH_DATA,
  MOCK_PIPELINE_STAGES,
  MOCK_PIPELINE_LOGS,
  MOCK_EVIDENCE_ITEMS,
  MOCK_EVALUATION_METRICS,
  MOCK_MODALITY_BENCHMARKS,
  MOCK_SEARCH_RESPONSES
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class KnowledgeDiscoveryAPI {
  private baseUrl: string;
  private isMockMode: boolean;

  constructor() {
    this.baseUrl = BASE_URL;
    this.isMockMode = true; // Defaults to high-fidelity mock mode unless connected
  }

  public setMockMode(mock: boolean) {
    this.isMockMode = mock;
  }

  public getMockMode(): boolean {
    return this.isMockMode;
  }

  public async checkHealth(): Promise<{ status: 'online' | 'offline'; latencyMs: number; version?: string }> {
    const start = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      const end = performance.now();
      if (response.ok) {
        const data = await response.json();
        return { status: 'online', latencyMs: Math.round(end - start), version: data.version || 'v2.4.0' };
      }
      return { status: 'offline', latencyMs: Math.round(end - start) };
    } catch {
      return { status: 'offline', latencyMs: 0 };
    }
  }

  // Documents
  public async getDocuments(): Promise<IngestedDocument[]> {
    if (this.isMockMode) {
      await this.simulateLatency(150);
      const custom = localStorage.getItem('kd_custom_documents');
      if (custom) {
        try {
          const parsed = JSON.parse(custom);
          return [...parsed, ...MOCK_DOCUMENTS];
        } catch {
          return MOCK_DOCUMENTS;
        }
      }
      return MOCK_DOCUMENTS;
    }
    const res = await fetch(`${this.baseUrl}/documents`);
    return res.json();
  }

  public async getDocument(id: string): Promise<IngestedDocument> {
    if (this.isMockMode) {
      const doc = (await this.getDocuments()).find(d => d.id === id);
      if (!doc) throw new Error(`Document ${id} not found`);
      return doc;
    }
    const res = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Document ${id} not found`);
    return res.json();
  }

  public async uploadDocument(doc: Partial<IngestedDocument>, file?: File): Promise<IngestedDocument> {
    if (this.isMockMode) {
      await this.simulateLatency(350);
      const newDoc: IngestedDocument = {
        id: `doc-${Date.now()}`,
        title: doc.title || 'Uploaded Document',
        filename: doc.filename || 'uploaded_asset.dat',
        modality: doc.modality || 'multimodal',
        fileSize: doc.fileSize || '3.4 MB',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'completed',
        progress: 100,
        domain: doc.domain || 'Cross-Modal Discovery',
        summary: doc.summary || 'Multimodal asset successfully ingested and processed through neural extraction pipeline.',
        confidenceScore: 0.94,
        entityCount: Math.floor(Math.random() * 8) + 4,
        relationCount: Math.floor(Math.random() * 12) + 6,
        tripletCount: Math.floor(Math.random() * 7) + 5,
        thumbnailUrl: doc.thumbnailUrl || (doc.modality === 'image' ? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80' : undefined),
        metadata: {
          embeddingModel: 'EVA-02-CLIP / Whisper-v3'
        }
      };

      const existing = localStorage.getItem('kd_custom_documents');
      const docs = existing ? JSON.parse(existing) : [];
      docs.unshift(newDoc);
      localStorage.setItem('kd_custom_documents', JSON.stringify(docs));

      return newDoc;
    }

    if (!file) throw new Error('A file is required when uploading to the live backend');
    const formData = new FormData();
    formData.append('file', file);
    if (doc.title) formData.append('title', doc.title);
    if (doc.domain) formData.append('domain', doc.domain);
    if (doc.modality && doc.modality !== 'multimodal') formData.append('modality', doc.modality);
    const res = await fetch(`${this.baseUrl}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed (${res.status})`);
    }
    return res.json();
  }

  // Entities & Relations
  public async getEntities(): Promise<Entity[]> {
    if (this.isMockMode) {
      await this.simulateLatency(120);
      return MOCK_ENTITIES;
    }
    const res = await fetch(`${this.baseUrl}/entities`);
    return res.json();
  }

  public async getRelations(): Promise<Relation[]> {
    if (this.isMockMode) {
      await this.simulateLatency(100);
      return MOCK_RELATIONS;
    }
    const res = await fetch(`${this.baseUrl}/relations`);
    return res.json();
  }

  public async getTriplets(): Promise<Triplet[]> {
    if (this.isMockMode) {
      await this.simulateLatency(140);
      return MOCK_TRIPLETS;
    }
    const res = await fetch(`${this.baseUrl}/triplets`);
    return res.json();
  }

  // Graph Data
  public async getGraphData(): Promise<GraphData> {
    if (this.isMockMode) {
      await this.simulateLatency(160);
      return MOCK_GRAPH_DATA;
    }
    const res = await fetch(`${this.baseUrl}/graph`);
    return res.json();
  }

  // Pipeline
  public async getPipelineStages(): Promise<PipelineStage[]> {
    if (this.isMockMode) {
      await this.simulateLatency(100);
      return MOCK_PIPELINE_STAGES;
    }
    const res = await fetch(`${this.baseUrl}/pipeline/stages`);
    return res.json();
  }

  public async getPipelineLogs(): Promise<PipelineLog[]> {
    if (this.isMockMode) {
      await this.simulateLatency(120);
      return MOCK_PIPELINE_LOGS;
    }
    const res = await fetch(`${this.baseUrl}/pipeline/logs`);
    return res.json();
  }

  // Evidence
  public async getEvidenceItems(): Promise<EvidenceItem[]> {
    if (this.isMockMode) {
      await this.simulateLatency(140);
      return MOCK_EVIDENCE_ITEMS;
    }
    const res = await fetch(`${this.baseUrl}/evidence`);
    return res.json();
  }

  // Search & Cross-Modal Query
  public async executeQuery(
    query: string,
    mode: 'hybrid_cross_modal' | 'vector_semantic' | 'knowledge_graph' | 'bm25' = 'hybrid_cross_modal',
    _modalityFilter: Modality | 'all' = 'all'
  ): Promise<SearchQueryResponse> {
    if (this.isMockMode) {
      await this.simulateLatency(450);
      const defaultResp = MOCK_SEARCH_RESPONSES.default;
      return {
        ...defaultResp,
        query,
        retrievalMode: mode,
        executionTimeMs: Math.floor(Math.random() * 80) + 140
      };
    }

    const res = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode, modality: _modalityFilter })
    });
    return res.json();
  }

  // Evaluation
  public async getEvaluationMetrics(): Promise<{ cards: EvaluationMetricCard[]; benchmarks: ModalityBenchmark[] }> {
    if (this.isMockMode) {
      await this.simulateLatency(120);
      return {
        cards: MOCK_EVALUATION_METRICS,
        benchmarks: MOCK_MODALITY_BENCHMARKS
      };
    }
    const res = await fetch(`${this.baseUrl}/evaluation`);
    return res.json();
  }

  private simulateLatency(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const api = new KnowledgeDiscoveryAPI();
