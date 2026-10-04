"""
FAISS Vector Storage Interface
Manages dense embedding indices, persistence, and fast similarity searches.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None


class FaissVectorStore:
    """Interface for FAISS vector indexing and similarity search."""

    def __init__(self, dimension: int = 384, index_path: Optional[str] = None) -> None:
        self.dimension = dimension
        self.index_path = Path(index_path) if index_path else None
        self.index = None
        self.metadata: List[Dict[str, Any]] = []
        self._init_index()

    def _init_index(self) -> None:
        """Initialize or load a FAISS IndexFlatIP (cosine similarity on normalized vectors)."""
        if faiss is None:
            return
        if self.index_path and self.index_path.exists():
            try:
                self.index = faiss.read_index(str(self.index_path))
                return
            except Exception:
                pass
        self.index = faiss.IndexFlatIP(self.dimension)

    def add_vectors(self, vectors: np.ndarray, metadata_list: List[Dict[str, Any]]) -> None:
        """Add embedding vectors and associated metadata."""
        if self.index is None:
            return
        # Normalize for cosine similarity
        norm = np.linalg.norm(vectors, axis=1, keepdims=True)
        norm[norm == 0] = 1.0
        normalized_vectors = (vectors / norm).astype("float32")
        self.index.add(normalized_vectors)
        self.metadata.extend(metadata_list)

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search top-k most similar items."""
        if self.index is None or self.index.ntotal == 0:
            return []
        norm = np.linalg.norm(query_vector)
        if norm > 0:
            query_vector = query_vector / norm
        query_vector = query_vector.astype("float32").reshape(1, -1)

        scores, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.metadata):
                item = dict(self.metadata[idx])
                item["score"] = float(score)
                results.append(item)
        return results

    def save(self, output_path: Optional[str] = None) -> None:
        """Persist index to disk."""
        path = Path(output_path) if output_path else self.index_path
        if faiss and self.index and path:
            path.parent.mkdir(parents=True, exist_ok=True)
            faiss.write_index(self.index, str(path))
