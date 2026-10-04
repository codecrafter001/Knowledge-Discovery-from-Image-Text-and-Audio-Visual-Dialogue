"""
Multimodal entity embedding and normalization module.
Computes vector representations for text, speech, and visual entities using transformers & PyTorch.
"""

from typing import Any, Dict, Optional
import numpy as np
import torch

_TOKENIZER = None
_MODEL = None


def normalize_embedding(vec: np.ndarray) -> np.ndarray:
    """
    L2-normalize an embedding vector so that no modality dominates fusion purely by vector scale.

    Args:
        vec: 1D or 2D numpy array.

    Returns:
        L2-normalized numpy array with unit norm.
    """
    if not isinstance(vec, np.ndarray):
        vec = np.array(vec, dtype=np.float32)

    norm = np.linalg.norm(vec, axis=-1, keepdims=True)
    norm = np.maximum(norm, 1e-12)
    return (vec / norm).astype(np.float32)


def get_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """Retrieve or initialize cached transformers tokenizer and model for sentence embeddings."""
    global _TOKENIZER, _MODEL
    if _MODEL is None or _TOKENIZER is None:
        try:
            from transformers import AutoTokenizer, AutoModel
            _TOKENIZER = AutoTokenizer.from_pretrained(model_name)
            _MODEL = AutoModel.from_pretrained(model_name)
            _MODEL.eval()
        except Exception as e:
            # Fallback to local or alternative model
            try:
                from transformers import AutoTokenizer, AutoModel
                _TOKENIZER = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
                _MODEL = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
                _MODEL.eval()
            except Exception as e2:
                raise RuntimeError(f"Failed to load embedding model '{model_name}': {e} | {e2}") from e
    return _TOKENIZER, _MODEL


def _mean_pooling(model_output, attention_mask):
    """Mean Pooling - Take attention mask into account for correct averaging."""
    token_embeddings = model_output[0]  # First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    return sum_embeddings / sum_mask


def get_entity_embedding(entity: Dict[str, Any], model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> np.ndarray:
    """
    Compute a normalized embedding vector for an entity extracted from text, speech, or vision.

    Args:
        entity: Entity dict with keys like 'text', 'label', 'canonical_name', 'source', etc.
        model_name: Sentence transformer model identifier.

    Returns:
        1D normalized float32 numpy array.
    """
    # 1. If entity carries a visual CLIP embedding
    if "clip_embedding" in entity and isinstance(entity["clip_embedding"], (list, np.ndarray)):
        raw_vec = np.array(entity["clip_embedding"], dtype=np.float32)
        return normalize_embedding(raw_vec)

    # 2. Text / Speech / Entity label representation
    text_content = (
        entity.get("canonical_name")
        or entity.get("text")
        or entity.get("label")
        or ""
    ).strip()

    if not text_content:
        return np.zeros(384, dtype=np.float32)

    tokenizer, model = get_embedding_model(model_name=model_name)

    encoded_input = tokenizer([text_content], padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        model_output = model(**encoded_input)
        sentence_embeddings = _mean_pooling(model_output, encoded_input["attention_mask"])
        vec = sentence_embeddings.squeeze(0).cpu().numpy().astype(np.float32)

    return normalize_embedding(vec)
