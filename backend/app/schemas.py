"""Request/response models. Field names mirror src/types/index.ts (camelCase on the wire)."""
from typing import Literal

from pydantic import BaseModel

Modality = Literal["text", "image", "audio", "video", "multimodal"]
IngestionStatus = Literal[
    "queued", "preprocessing", "extracting", "embedding", "graph_linking", "completed", "failed"
]
RetrievalMode = Literal["hybrid_cross_modal", "vector_semantic", "knowledge_graph", "bm25"]


class QueryRequest(BaseModel):
    query: str
    mode: RetrievalMode = "hybrid_cross_modal"
    modality: Modality | Literal["all"] = "all"


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
