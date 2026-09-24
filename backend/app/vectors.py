"""Passage embeddings and the FAISS index over all indexed documents.

Each document's passage vectors are stored as storage/vectors/<doc_id>.npy, row-aligned
with the "passages" list in its extraction file. The in-memory index is rebuilt whenever
the set of vector files changes, which is cheap at this corpus size (exact inner-product
search over normalized vectors = cosine similarity).
"""
import json
import re
import threading
from dataclasses import dataclass

import numpy as np

from . import config

_model = None
_model_lock = threading.Lock()
_index_lock = threading.Lock()
_index_cache: tuple[tuple, "PassageIndex"] | None = None

TOKEN_RE = re.compile(r"\w+")


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(config.EMBED_MODEL, device="cpu")
        return _model


def embed(texts: list[str]) -> np.ndarray:
    if not texts:
        return np.zeros((0, get_model().get_sentence_embedding_dimension()), dtype=np.float32)
    return get_model().encode(texts, normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)


def save(doc_id: str, vectors: np.ndarray) -> None:
    config.VECTORS_DIR.mkdir(parents=True, exist_ok=True)
    np.save(config.VECTORS_DIR / f"{doc_id}.npy", vectors)


def normalize(text: str) -> str:
    """Collapse whitespace (PDF text breaks lines mid-sentence) for display and embedding."""
    return " ".join(text.split())


def tokenize(text: str) -> list[str]:
    from spacy.lang.en.stop_words import STOP_WORDS

    return [t for t in TOKEN_RE.findall(text.lower()) if t not in STOP_WORDS]


@dataclass
class PassageIndex:
    passages: list[dict]  # {docId, modality, text, page, charSpan}
    faiss_index: object | None
    bm25: object | None

    def __len__(self) -> int:
        return len(self.passages)


def _build_index(files: list) -> PassageIndex:
    import faiss
    from rank_bm25 import BM25Okapi

    passages, matrices = [], []
    for vec_path in files:
        ex_path = config.EXTRACTIONS_DIR / f"{vec_path.stem}.json"
        if not ex_path.exists():
            continue
        ex = json.loads(ex_path.read_text(encoding="utf-8"))
        vectors = np.load(vec_path)
        if len(vectors) != len(ex.get("passages", [])):
            continue
        passages += [{"docId": ex["docId"], "modality": ex["modality"], **p} for p in ex["passages"]]
        matrices.append(vectors)

    if not passages:
        return PassageIndex([], None, None)
    matrix = np.vstack(matrices)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    return PassageIndex(passages, index, BM25Okapi([tokenize(p["text"]) or [""] for p in passages]))


def get_index() -> PassageIndex:
    global _index_cache
    files = sorted(config.VECTORS_DIR.glob("*.npy")) if config.VECTORS_DIR.exists() else []
    key = tuple((f.name, f.stat().st_mtime_ns) for f in files)
    with _index_lock:
        if _index_cache is None or _index_cache[0] != key:
            _index_cache = (key, _build_index(files))
        return _index_cache[1]
