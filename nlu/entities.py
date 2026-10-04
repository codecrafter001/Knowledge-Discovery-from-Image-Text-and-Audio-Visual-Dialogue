"""
Named Entity Recognition (NER) module using spaCy.
Extracts entities with character spans and categorical labels from text.
"""

from typing import Any, Dict, List, Optional
import spacy

_SPACY_NLP = None


def get_nlp(model_name: Optional[str] = None):
    """Retrieve or initialize a cached spaCy NLP model."""
    global _SPACY_NLP
    if _SPACY_NLP is None:
        models_to_try = [model_name] if model_name else ["en_core_web_trf", "en_core_web_sm"]
        for m in models_to_try:
            if not m:
                continue
            try:
                _SPACY_NLP = spacy.load(m)
                break
            except Exception:
                continue

        if _SPACY_NLP is None:
            # Fallback to blank english model with entity ruler if none installed
            _SPACY_NLP = spacy.blank("en")

    return _SPACY_NLP


def extract_entities(text: str, model_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Extract named entities from raw text (OCR text, ASR transcripts, or documents).

    Args:
        text: Input string.
        model_name: Optional specific spaCy model to use.

    Returns:
        List of dicts:
        [{"text": str, "label": str, "start_char": int, "end_char": int}, ...]
    """
    if not text or not isinstance(text, str) or not text.strip():
        return []

    nlp = get_nlp(model_name=model_name)
    doc = nlp(text)

    entities: List[Dict[str, Any]] = []
    for ent in doc.ents:
        entities.append({
            "text": ent.text.strip(),
            "label": ent.label_,
            "start_char": int(ent.start_char),
            "end_char": int(ent.end_char),
        })

    return entities
