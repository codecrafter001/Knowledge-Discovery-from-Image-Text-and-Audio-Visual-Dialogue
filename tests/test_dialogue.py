"""
Unit tests for Dialogue Act classification module.
"""

import pytest
from nlu.dialogue import analyze_dialogue, classify_utterance_act


def test_classify_utterance_act():
    assert classify_utterance_act("What is the quarterly revenue?") == "question"
    assert classify_utterance_act("Can you hear me clearly?") == "question"
    assert classify_utterance_act("Please send the financial summary report.") == "command"
    assert classify_utterance_act("Show the latest quarterly charts.") == "command"
    assert classify_utterance_act("The revenue grew by 15 percent this year.") == "statement"


def test_analyze_dialogue():
    transcript = [
        {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.5, "text": "What are the latest revenue numbers?"},
        {"speaker": "SPEAKER_01", "start": 2.6, "end": 6.0, "text": "We reached ten million dollars in profit."},
        {"speaker": "SPEAKER_00", "start": 6.1, "end": 8.5, "text": "Please send me the full audit report."},
    ]

    analyzed = analyze_dialogue(transcript)

    assert len(analyzed) == 3
    assert analyzed[0]["dialogue_act"] == "question"
    assert analyzed[1]["dialogue_act"] == "statement"
    assert analyzed[2]["dialogue_act"] == "command"


def test_analyze_dialogue_empty():
    assert analyze_dialogue([]) == []
