# 🧠 Multimodal Knowledge Discovery from Image, Text & Audio-Visual Dialogue

A production-grade, AI-driven Knowledge Discovery and Multi-Modal Reasoning platform built with **React, Vite, TypeScript, Tailwind CSS, Canvas Force Graphs, and Lucide Icons**.

---

## 🌟 Overview & Architecture

The system discovers, grounds, and reasons over complex knowledge structures extracted asynchronously from disparate multimodal inputs:
- **Text**: Clinical papers, technical research reports, structured JSON/markdown.
- **Image**: High-resolution planetary imagery, geospatial multispectral bands, and medical scans with bounding box annotations.
- **Audio Dialogue**: Panel symposiums, podcast discussions, and acoustic speech transcripts with speaker diarization.
- **Audio-Visual Video**: Autonomous vehicle tele-operation records, traffic surveillance, and multi-speaker dialogue scenes with spatial bounding boxes and timestamps.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTION & DECODING                            │
│   (PDF / DOCX / TXT)    (PNG / TIFF)     (WAV / MP3)     (MP4 / MKV)  │
└───────────────────┬──────────────┬──────────────┬──────────────┬───────┘
                    ▼              ▼              ▼              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  MULTIMODAL FEATURE EXTRACTION                         │
│       EVA-02-CLIP        SegmentAnything-2   Whisper-Turbo    DINOv2   │
│       (1536-dim)            (Spatial BBox)    (Diarization)   (Vision) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  CROSS-MODAL ALIGNMENT & FUSION                        │
│            Speaker Coreference ── Grounded Spatial Overlap             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               KNOWLEDGE TRIPLET SYNTHESIS & OPEN-IE                    │
│          (Subject) ──[Predicate / Relation]──▶ (Object)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                VECTOR INDEXING & KNOWLEDGE GRAPH                       │
│             Qdrant Vector Store  ◄──►  Neo4j Cypher Engine             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Modules & Pages

1. **📊 Executive Dashboard (`/dashboard`)**: High-level KPIs, discovery feed, modality distribution, and prominent knowledge nodes.
2. **📤 Multimodal Ingestion Suite (`/upload`)**: Drag & drop file uploads, demo presets (NASA Mars Mastcam, Quantum Dialogue, Oncology Report), and live pipeline progress.
3. **📂 Document Repository (`/documents`)**: Filterable grid and table views with deep preview drawer (interactive bounding boxes, synchronized audio waveform player, PDF reader).
4. **⚡ Processing Pipeline (`/pipeline`)**: Interactive 5-stage DAG visualizer with latency benchmarks, throughput metrics, and live log stream.
5. **🔍 Knowledge Explorer (`/explorer`)**: Entities catalog, relation types matrix, and verified triplets browser with confidence scores.
6. **🧠 Cross-Modal Query Engine (`/search`)**: Natural language question answering with step-by-step reasoning trace and grounded citations.
7. **🛡️ Evidence & Grounding (`/evidence`)**: Primary source media inspector with spatial bounding boxes, audio timestamps, and alignment metrics.
8. **🌐 Interactive Knowledge Graph (`/graph`)**: Canvas force-directed relational graph with zoom/pan, path finder, and node detail drawer.
9. **📈 Evaluation & Metrics (`/evaluation`)**: F1 scores, cross-modal alignment accuracy, confusion matrix, and precision-recall simulator.
10. **⚙️ System & API Settings (`/settings`)**: FastAPI connection manager, Mock Engine toggle, model hyperparameters, and export tools (JSON, RDF Turtle, Cypher, CSV).

---

## 🔒 Policy & Security Guardrails

The platform adheres to zero-trust security standards across:
- **OPA (Open Policy Agent)**: Access control, tenant isolation, and PII masking rules in `security/opa/policy.rego`.
- **Checkov**: Infrastructure and container static analysis in `security/checkov/config.yaml`.
- **Trivy**: Vulnerability and secret scanning in `security/trivy/trivy.yaml`.
- **tfsec**: Cloud infrastructure policy enforcement in `security/tfsec/tfsec-config.json`.

---

## 🛠️ Targeted Repair Agent

Located in `agents/repair_agent/repair_engine.ts`, this autonomous self-healing agent detects pipeline extraction bottlenecks:
- Resolves OCR degradation via adaptive contrast stretching.
- Overcomes ASR clipping via spectral noise subtraction and beam expansion.
- Heals cross-modal coreference mismatches through WordNet synonym alignment.
- Deduplicates entity vertices and enforces acyclic graph constraints.

---

## 💻 Installation & Quickstart

```bash
# 1. Clone the repository
git clone <repo-url>
cd "Knowledge Discovery"

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
```

---

## 📄 License & Attribution
MIT License. Developed for advanced multimodal knowledge discovery research.
