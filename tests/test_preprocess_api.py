"""
Integration tests for FastAPI preprocessing endpoints.
"""

from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.app.main import app

client = TestClient(app)

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()
SAMPLE_VIDEO = Path("sample_data/sample_video.mp4").resolve()
SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


def test_api_preprocess_image():
    assert SAMPLE_IMAGE.exists()
    with open(SAMPLE_IMAGE, "rb") as f:
        response = client.post(
            "/preprocess/image",
            files={"file": ("sample_image.png", f, "image/png")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clean_path" in data
    assert Path(data["clean_path"]).exists()
    assert data["dimensions"]["height"] > 0
    assert data["dimensions"]["width"] > 0


def test_api_preprocess_video():
    assert SAMPLE_VIDEO.exists()
    with open(SAMPLE_VIDEO, "rb") as f:
        response = client.post(
            "/preprocess/video",
            files={"file": ("sample_video.mp4", f, "video/mp4")},
            data={"threshold": 0.3}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["keyframe_count"] >= 1
    assert len(data["keyframes"]) >= 1
    for kf in data["keyframes"]:
        assert "timestamp" in kf
        assert "frame_path" in kf
        assert Path(kf["frame_path"]).exists()


def test_api_preprocess_audio():
    assert SAMPLE_AUDIO.exists()
    with open(SAMPLE_AUDIO, "rb") as f:
        response = client.post(
            "/preprocess/audio",
            files={"file": ("sample_audio.wav", f, "audio/wav")},
            data={"run_diarization": False}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clean_audio_path" in data
    assert Path(data["clean_audio_path"]).exists()
    assert data["sample_rate"] == 16000
    assert data["channels"] == 1
