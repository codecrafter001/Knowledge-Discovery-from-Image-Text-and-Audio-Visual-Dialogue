"""
Unit tests for Named Entity Recognition module.
"""

import pytest
from nlu.entities import extract_entities


def test_extract_entities():
    text = "Satya Nadella is the CEO of Microsoft Corporation located in Redmond."
    entities = extract_entities(text)

    assert isinstance(entities, list)
    assert len(entities) >= 2

    labels = {e["label"] for e in entities}
    texts = [e["text"] for e in entities]

    for ent in entities:
        assert "text" in ent
        assert "label" in ent
        assert "start_char" in ent
        assert "end_char" in ent
        assert ent["start_char"] < ent["end_char"]
        assert text[ent["start_char"]:ent["end_char"]] == ent["text"]

    # Verify key entities detected
    assert any("Microsoft" in t for t in texts)
    assert "ORG" in labels or "PERSON" in labels


def test_extract_entities_empty():
    assert extract_entities("") == []
    assert extract_entities("   ") == []
