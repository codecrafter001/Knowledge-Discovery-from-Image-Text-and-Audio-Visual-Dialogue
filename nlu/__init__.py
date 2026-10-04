"""
Natural Language Understanding (NLU) package for the Knowledge Discovery project.
Provides modules for Entity Extraction, Relation Extraction, Coreference Resolution, and Dialogue Act Analysis.
"""

from .entities import extract_entities
from .relations import extract_relations
from .coreference import resolve_coreferences
from .dialogue import analyze_dialogue

__all__ = [
    "extract_entities",
    "extract_relations",
    "resolve_coreferences",
    "analyze_dialogue",
]
