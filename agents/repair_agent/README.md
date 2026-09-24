# Targeted Repair Agent (Self-Healing Subsystem)

The **Targeted Repair Agent** provides autonomous error remediation for multimodal ingestion and knowledge graph synthesis pipelines.

## Diagnostic Capabilities & Remediation Strategies

| Diagnostic Code | Failure Root Cause | Targeted Remediation Strategy |
| :--- | :--- | :--- |
| `OCR_LOW_CONFIDENCE` | Low scan resolution / lighting glare | Adaptive Otsu thresholding, contrast stretching, LayoutLMv3 fallback |
| `ASR_AUDIO_CLIPPING` | Background noise / overlapping speech | Spectral noise filtering, Whisper beam expansion (5 ➔ 10), temperature annealing |
| `CROSS_MODAL_ALIGNMENT_MISMATCH` | Inexact bounding box overlap | Spatial IoU margin expansion (+15%) & WordNet synonym alignment |
| `TRIPLET_SCHEMA_CONFLICT` | Cyclical graph edges or duplicate entities | Entity deduplication, vertex merging & acyclic schema enforcement |
| `API_BACKEND_TIMEOUT` | FastAPI server disconnect / offline | Zero-downtime hot-swap to High-Fidelity Mock Engine |

## Programmatic Usage

```typescript
import { repairAgent } from './agents/repair_agent/repair_engine';

const remediation = await repairAgent.diagnoseAndRemediate({
  errorCode: 'CROSS_MODAL_ALIGNMENT_MISMATCH',
  stageId: 'stage-3',
  modality: 'multimodal',
  rawMessage: 'Speaker dialogue could not be grounded to visual region [bb-4]',
  confidenceScore: 0.64
});

console.log(`Resolved: ${remediation.resolved} with score ${remediation.remediatedScore}`);
```
