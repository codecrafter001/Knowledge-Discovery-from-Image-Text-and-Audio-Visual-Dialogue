"""
Integration tests for FastAPI POST /understand endpoint.
"""

from fastapi.testclient import TestClient
import pytest

from backend.app.main import app

client = TestClient(app)


def test_api_understand_text():
    payload = {
        "text": "Dr. Sharma joined Microsoft Corporation in Redmond. She presented the quarterly analysis report."
    }
    response = client.post("/understand", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert "resolved_text" in data
    assert "Dr. Sharma" in data["resolved_text"] or "Sharma" in data["resolved_text"]
    assert "She presented" not in data["resolved_text"]

    assert "entities" in data
    assert len(data["entities"]) >= 1

    assert "relations" in data
    assert isinstance(data["relations"], list)


def test_api_understand_transcript():
    payload = {
        "transcript": [
            {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.5, "text": "What is the new strategy for Google?"},
            {"speaker": "SPEAKER_01", "start": 2.6, "end": 5.0, "text": "Sundar Pichai announced new AI features."}
        ]
    }
    response = client.post("/understand", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert len(data["entities"]) >= 1
    assert data["transcript"] is not None
    assert len(data["transcript"]) == 2
    assert data["transcript"][0]["dialogue_act"] == "question"
    assert data["transcript"][1]["dialogue_act"] == "statement"
