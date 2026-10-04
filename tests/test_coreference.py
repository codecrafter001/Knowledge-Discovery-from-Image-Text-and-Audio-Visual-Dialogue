"""
Unit tests for Coreference Resolution module.
"""

import pytest
from nlu.coreference import resolve_coreferences


def test_resolve_coreferences_pronoun():
    text = "Dr. Sharma joined the meeting. She then presented the report."
    resolved = resolve_coreferences(text)

    # Verify 'She' was resolved to 'Dr. Sharma' or 'Sharma'
    assert "Dr. Sharma" in resolved or "Sharma" in resolved
    # 'She' should be replaced
    assert "She then" not in resolved


def test_resolve_coreferences_organization():
    text = "Microsoft released the new model. It announced significant speedups."
    resolved = resolve_coreferences(text)
    assert "Microsoft" in resolved
    assert "It announced" not in resolved


def test_resolve_coreferences_empty():
    assert resolve_coreferences("") == ""
    assert resolve_coreferences("   ") == ""
