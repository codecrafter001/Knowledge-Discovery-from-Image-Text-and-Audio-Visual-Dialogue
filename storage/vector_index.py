"""
FAISS Vector Index module for entity embeddings.
Persists entity embeddings and enables semantic similarity searches mapped to Neo4j entity IDs.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

from fusion.embeddings import normalize_embedding


DEFAULT_INDEX_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_INDEX_PATH = DEFAULT_INDEX_DIR / "entity_embeddings.faiss"
DEFAULT_META_PATH = DEFAULT_INDEX_DIR / "entity_embeddings_meta.json"


class FaissIndex:
    """FAISS index wrapper for storing and querying entity dense embeddings."""

    def __init__(
        self,
        dimension: int = 384,
        index_path: Optional[Union[str, Path]] = None,
        meta_path: Optional[Union[str, Path]] = None,
    ) -> None:
        self.dimension = dimension
        self.index_path = Path(index_path) if index_path else DEFAULT_INDEX_PATH
        self.meta_path = Path(meta_path) if meta_path else DEFAULT_META_PATH
        self.index = None
        self.id_map: List[Dict[str, Any]] = []
        self._load_or_create()

    def _load_or_create(self) -> None:
        """Load an existing FAISS index from disk or initialize a new IndexFlatIP."""
        if faiss is None:
            return

        # Load metadata if exists
        if self.meta_path.exists():
            try:
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.id_map = json.load(f)
            except Exception:
                self.id_map = []

        # Load binary index if exists
        if self.index_path.exists():
            try:
                self.index = faiss.read_index(str(self.index_path))
                return
            except Exception:
                pass

        # IndexFlatIP computes inner product, which equals cosine similarity for normalized vectors
        self.index = faiss.IndexFlatIP(self.dimension)

    def save(self) -> None:
        """Persist the FAISS index and ID mapping to disk."""
        if faiss is None or self.index is None:
            return

        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))

        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.id_map, f, indent=2)

    def add(self, entity_id: str, embedding: np.ndarray, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Add an entity embedding vector to the FAISS index.

        Args:
            entity_id: The Neo4j internal node id or canonical identifier.
            embedding: 1D numpy array representing the entity embedding.
            metadata: Optional additional metadata dict.
        """
        if not isinstance(embedding, np.ndarray):
            embedding = np.array(embedding, dtype=np.float32)

        # Normalize embedding for cosine similarity
        norm_vec = normalize_embedding(embedding)
        if norm_vec.ndim == 1:
            norm_vec = norm_vec.reshape(1, -1)
        norm_vec = norm_vec.astype(np.float32)

        if faiss is None:
            meta_entry = {"entity_id": str(entity_id), "vector": norm_vec.flatten().tolist()}
            if metadata:
                meta_entry.update(metadata)
            self.id_map.append(meta_entry)
            return

        if self.index is None:
            self.index = faiss.IndexFlatIP(self.dimension)

        self.index.add(norm_vec)
        meta_entry = {"entity_id": str(entity_id)}
        if metadata:
            meta_entry.update(metadata)
        self.id_map.append(meta_entry)

        # Automatically persist on modification
        self.save()

    def search(self, query_embedding: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        """
        Search the top-k most similar entities for a query embedding.

        Args:
            query_embedding: 1D numpy array vector.
            k: Number of nearest neighbors to retrieve.

        Returns:
            List of dicts:
            [{"entity_id": str, "score": float, ...}, ...]
        """
        if not isinstance(query_embedding, np.ndarray):
            query_embedding = np.array(query_embedding, dtype=np.float32)

        norm_query = normalize_embedding(query_embedding)
        if norm_query.ndim == 1:
            norm_query = norm_query.reshape(1, -1)
        norm_query = norm_query.astype(np.float32)

        if faiss is None:
            if not self.id_map:
                return []
            results = []
            q_flat = norm_query.flatten()
            for entry in self.id_map:
                vec = np.array(entry.get("vector", []), dtype=np.float32)
                if len(vec) == len(q_flat):
                    score = float(np.dot(q_flat, vec))
                    res = {k: v for k, v in entry.items() if k != "vector"}
                    res["score"] = score
                    results.append(res)
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:k]

        if self.index is None or self.index.ntotal == 0:
            return []

        search_k = min(k, self.index.ntotal)
        scores, indices = self.index.search(norm_query, search_k)

        results: List[Dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(self.id_map):
                item = dict(self.id_map[idx])
                item["score"] = float(score)
                results.append(item)

        return results

    def reset(self) -> None:
        """Clear all entries from index and metadata."""
        if faiss is not None:
            self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map = []
        if self.index_path.exists():
            try:
                self.index_path.unlink()
            except Exception:
                pass
        if self.meta_path.exists():
            try:
                self.meta_path.unlink()
            except Exception:
                pass
