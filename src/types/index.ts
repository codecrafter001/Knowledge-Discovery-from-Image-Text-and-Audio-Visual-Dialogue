export type Modality = 'text' | 'image' | 'audio' | 'video' | 'multimodal';

// Where extracted evidence came from: native document text, OCR of an image region, or an image caption.
export type EvidenceSource = 'text' | 'ocr' | 'caption';

export type IngestionStatus = 'queued' | 'preprocessing' | 'extracting' | 'embedding' | 'graph_linking' | 'completed' | 'failed';

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  color: string;
  x: number; // percentage 0 - 100
  y: number;
  width: number;
  height: number;
  entityId?: string;
}

export interface DialogueUtterance {
  id: string;
  speaker: string;
  startTime: number; // seconds
  endTime: number;
  text: string;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'inquisitive' | 'critical';
  extractedEntities?: string[];
}

export interface IngestedDocument {
  id: string;
  title: string;
  filename: string;
  modality: Modality;
  fileSize: string;
  uploadedAt: string;
  status: IngestionStatus;
  progress: number; // 0 - 100
  domain: string;
  summary: string;
  confidenceScore: number;
  entityCount: number;
  relationCount: number;
  tripletCount: number;
  thumbnailUrl?: string;
  contentUrl?: string;
  // Specific modality data
  textContent?: string;
  boundingBoxes?: BoundingBox[];
  dialogueUtterances?: DialogueUtterance[];
  audioDuration?: number; // seconds
  videoDuration?: number; // seconds
  metadata: {
    resolution?: string;
    sampleRate?: string;
    pageCount?: number;
    tokenCount?: number;
    asrEngine?: string;
    visionModel?: string;
    embeddingModel?: string;
    nlpModel?: string;
  };
}

export interface Entity {
  id: string;
  name: string;
  category: 'Concept' | 'Person' | 'Organization' | 'Technology' | 'Visual Object' | 'Audio Event' | 'Location' | 'Metric';
  description: string;
  modalityOrigins: Modality[];
  frequency: number;
  confidence: number;
  sourceDocIds: string[];
  aliases: string[];
  attributes: Record<string, string | number>;
  color?: string;
}

export interface Relation {
  id: string;
  name: string;
  category: 'Structural' | 'Causal' | 'Semantic' | 'Visual-Spatial' | 'Audio-Conversational' | 'Temporal';
  description: string;
  count: number;
  inverseName?: string;
}

export interface Triplet {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCategory: string;
  predicate: string;
  objectId: string;
  objectName: string;
  objectCategory: string;
  modality: Modality;
  confidence: number;
  sourceDocId: string;
  sourceDocTitle: string;
  evidenceSnippet: string;
  timestampRange?: [number, number]; // for audio/video [start, end]
  pageNumber?: number; // for pdf
  charSpan?: [number, number]; // for text: [start, end) offsets into the document text
  evidenceSource?: EvidenceSource;
  boundingBox?: BoundingBox; // for image
  verified: boolean;
}

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  modality: Modality;
  val: number; // Node weight/radius
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  entity: Entity;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  predicate: string;
  confidence: number;
  modality: Modality;
  tripletId: string;
  color?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface PipelineStage {
  id: string;
  order: number;
  name: string;
  description: string;
  modality: Modality;
  status: 'idle' | 'running' | 'completed' | 'warning' | 'error';
  latencyMs: number;
  throughput: string;
  modelEngine: string;
  metrics: Record<string, string | number>;
}

export interface PipelineLog {
  id: string;
  timestamp: string;
  stageId: string;
  stageName: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, any>;
}

export interface SearchCitation {
  id: string;
  docId: string;
  docTitle: string;
  modality: Modality;
  confidence: number;
  snippet: string;
  pageNumber?: number;
  timestampRange?: string; // "01:24 - 01:45"
  boundingBoxLabel?: string;
  groundingScore: number;
}

export interface ReasoningStep {
  step: number;
  type: 'Retrieval' | 'Cross-Modal Fusion' | 'Knowledge Graph Traversal' | 'Deductive Verification';
  description: string;
  evidenceCited: string;
  confidence: number;
}

export interface SearchQueryResponse {
  query: string;
  answer: string;
  confidence: number;
  retrievalMode: 'hybrid_cross_modal' | 'vector_semantic' | 'knowledge_graph' | 'bm25';
  executionTimeMs: number;
  reasoningChain: ReasoningStep[];
  citations: SearchCitation[];
  subgraphNodes: string[];
}

export interface EvidenceItem {
  id: string;
  tripletId: string;
  tripletText: string;
  docId: string;
  docTitle: string;
  modality: Modality;
  confidence: number;
  textSnippet?: string;
  pageNumber?: number;
  charSpan?: [number, number];
  imageUrl?: string;
  boundingBox?: BoundingBox;
  audioUrl?: string;
  videoUrl?: string;
  dialogueUtterance?: DialogueUtterance;
  evidenceSource?: EvidenceSource;
  alignmentScore: number;
  asrOcrConfidence: number | null; // null for model-generated captions
  crossModalConsistency: number;
}

export interface EvaluationMetricCard {
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  benchmark: string;
  modality: Modality;
  description: string;
}

export interface ModalityBenchmark {
  modality: string;
  precision: number;
  recall: number;
  f1: number;
  alignmentScore: number;
  hallucinationRate: number;
  avgLatencyMs: number;
}

export interface AppSettings {
  apiBaseUrl: string;
  useMockBackend: boolean;
  activeDataset: string;
  llmModel: string;
  vlmModel: string;
  asrModel: string;
  similarityThreshold: number;
  autoLinkThreshold: number;
  enableCrossModalReasoning: boolean;
  enableCommunityDetection: boolean;
  theme: 'obsidian' | 'cyber' | 'light';
}
