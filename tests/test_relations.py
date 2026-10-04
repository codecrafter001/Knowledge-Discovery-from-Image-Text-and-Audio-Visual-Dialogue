"""
Unit tests for Relation Extraction module.
"""

import pytest
from nlu.entities import extract_entities
from nlu.relations import extract_relations


def test_extract_relations_with_entities():
    text = "Google acquired DeepMind in London."
    entities = extract_entities(text)
    relations = extract_relations(text, entities=entities)

    assert isinstance(relations, list)
    assert len(relations) >= 1

    for r in relations:
        assert "subject" in r
        assert "relation" in r
        assert "object" in r
        assert "confidence" in r
        assert isinstance(r["confidence"], float)

    # Verify relation found
    subjects = [r["subject"].lower() for r in relations]
    relations_verbs = [r["relation"].lower() for r in relations]
    assert any("google" in s for s in subjects)
    assert any("acquire" in v for v in relations_verbs)


def test_extract_relations_empty():
    assert extract_relations("") == []
    assert extract_relations("   ") == []
