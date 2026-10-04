"""
Multimodal Late Fusion Engine.
Reconciles and deduplicates multimodal entities across text, speech, and vision.
"""

from .embeddings import get_entity_embedding, normalize_embedding
from .reconcile import reconcile_entities, compute_cosine_similarity
from .pipeline import fuse

__all__ = [
    "get_entity_embedding",
    "normalize_embedding",
    "reconcile_entities",
    "compute_cosine_similarity",
    "fuse",
]
