"""
Integration tests for FastAPI /extract endpoints (text, vision, speech).
"""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.app.main import app

client = TestClient(app)

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()
SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


def test_api_extract_text():
    assert SAMPLE_IMAGE.exists()
    with open(SAMPLE_IMAGE, "rb") as f:
        response = client.post(
            "/extract/text",
            files={"file": ("sample_image.png", f, "image/png")},
            data={"languages": "en"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clean_image_path" in data
    assert "text_regions" in data
    assert isinstance(data["text_regions"], list)


def test_api_extract_vision():
    assert SAMPLE_IMAGE.exists()
    with open(SAMPLE_IMAGE, "rb") as f:
        response = client.post(
            "/extract/vision",
            files={"file": ("sample_image.png", f, "image/png")},
            data={"conf_threshold": 0.2}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clean_image_path" in data
    assert "objects" in data
    assert "clip_embedding_dim" in data
    assert data["clip_embedding_dim"] in [512, 768, 1024]
    assert "clip_embedding_sample" in data
    assert len(data["clip_embedding_sample"]) == 5


def test_api_extract_speech():
    assert SAMPLE_AUDIO.exists()
    with open(SAMPLE_AUDIO, "rb") as f:
        response = client.post(
            "/extract/speech",
            files={"file": ("sample_audio.wav", f, "audio/wav")},
            data={"whisper_model": "tiny", "run_diarization": False}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clean_audio_path" in data
    assert "transcript" in data
    assert isinstance(data["transcript"], list)
