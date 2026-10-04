"""
Coreference Resolution module.
Resolves and replaces pronominal references with their antecedent entity mentions.
"""

from typing import List, Optional, Tuple
import re

_FCOREF_MODEL = None


def get_fastcoref_model(model_name: str = "biu-nlp/f-coref", device: str = "cpu"):
    """Retrieve or initialize a cached FCoref model."""
    global _FCOREF_MODEL
    if _FCOREF_MODEL is None:
        try:
            from fastcoref import FCoref
            _FCOREF_MODEL = FCoref(model_name_or_path=model_name, device=device)
        except Exception as e:
            # Fall back to None so linguistic heuristic is used
            _FCOREF_MODEL = None
    return _FCOREF_MODEL


def _resolve_with_fastcoref(text: str) -> Optional[str]:
    """Attempt coreference resolution using FCoref neural model."""
    try:
        model = get_fastcoref_model()
        if model is None:
            return None

        preds = model.predict(texts=[text])
        if not preds or len(preds) == 0:
            return None

        pred = preds[0]
        clusters = pred.get_clusters(as_strings=False)
        if not clusters:
            return text

        # Sort replacements backwards by start index to prevent offset shifting
        replacements: List[Tuple[int, int, str]] = []

        for cluster in clusters:
            if len(cluster) < 2:
                continue

            # First mention in the cluster is the canonical antecedent
            antecedent_start, antecedent_end = cluster[0]
            antecedent_text = text[antecedent_start:antecedent_end].strip()

            for mention_start, mention_end in cluster[1:]:
                mention_text = text[mention_start:mention_end].strip()
                # Only replace if mention is a pronoun or shorter reference
                if mention_text.lower() in [
                    "he", "him", "his", "himself",
                    "she", "her", "hers", "herself",
                    "it", "its", "itself",
                    "they", "them", "their", "theirs", "themselves",
                    "this", "that", "these", "those"
                ] or len(mention_text) < len(antecedent_text):
                    replacements.append((mention_start, mention_end, antecedent_text))

        if not replacements:
            return text

        # Sort in reverse order of start position
        replacements.sort(key=lambda r: r[0], reverse=True)
        resolved_chars = list(text)
        for start, end, rep_text in replacements:
            resolved_chars[start:end] = list(rep_text)

        return "".join(resolved_chars)
    except Exception:
        return None


def _resolve_with_linguistic_rules(text: str) -> str:
    """
    Fallback pronoun resolution using spaCy entity and subject tracking across sentences.
    """
    from .entities import get_nlp

    nlp = get_nlp()
    doc = nlp(text)

    # Track recent entities & subjects by gender / entity type
    replacements: List[Tuple[int, int, str]] = []

    last_person: Optional[str] = None
    last_org_or_thing: Optional[str] = None

    for sent in doc.sents:
        # Check entities in this sentence
        for ent in sent.ents:
            if ent.label_ == "PERSON":
                last_person = ent.text.strip()
            elif ent.label_ in ["ORG", "GPE", "PRODUCT", "WORK_OF_ART"]:
                last_org_or_thing = ent.text.strip()

        # Check tokens for pronouns
        for token in sent:
            lower = token.text.lower()
            if lower in ["she", "her", "hers", "herself", "he", "him", "his", "himself"] and last_person:
                replacements.append((token.idx, token.idx + len(token.text), last_person))
            elif lower in ["it", "its", "itself"] and last_org_or_thing:
                replacements.append((token.idx, token.idx + len(token.text), last_org_or_thing))

    if not replacements:
        return text

    replacements.sort(key=lambda r: r[0], reverse=True)
    resolved_chars = list(text)
    for start, end, rep_text in replacements:
        resolved_chars[start:end] = list(rep_text)

    return "".join(resolved_chars)


def resolve_coreferences(text: str) -> str:
    """
    Resolve and substitute coreferences in text.

    Args:
        text: Input string (e.g. 'Dr. Sharma joined the meeting. She then presented the report.').

    Returns:
        String with pronouns and references resolved to their antecedents.
    """
    if not text or not isinstance(text, str) or not text.strip():
        return ""

    # Try fastcoref neural model first
    result = _resolve_with_fastcoref(text)
    if result is not None:
        return result

    # Fallback to linguistic dependency rule resolution
    return _resolve_with_linguistic_rules(text)
