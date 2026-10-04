"""
Unit tests for YOLOv8 object detection and CLIP embedding extraction.
"""

from pathlib import Path
import numpy as np
import pytest

from extractors.vision.object_detection import detect_objects, get_clip_embedding

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()


def test_detect_objects_returns_list():
    assert SAMPLE_IMAGE.exists()
    results = detect_objects(str(SAMPLE_IMAGE))
    assert isinstance(results, list)
    for obj in results:
        assert "bbox" in obj
        assert len(obj["bbox"]) == 4
        assert "label" in obj
        assert "confidence" in obj
        assert isinstance(obj["confidence"], float)


def test_get_clip_embedding():
    assert SAMPLE_IMAGE.exists()
    embedding = get_clip_embedding(str(SAMPLE_IMAGE))
    assert isinstance(embedding, np.ndarray)
    assert embedding.ndim == 1
    assert embedding.shape[0] in [512, 768, 1024]
    # Check that embedding is normalized to unit length
    norm = np.linalg.norm(embedding)
    assert pytest.approx(norm, rel=1e-2) == 1.0


def test_detect_objects_file_not_found():
    with pytest.raises(FileNotFoundError):
        detect_objects("sample_data/non_existent_image.png")


def test_get_clip_embedding_file_not_found():
    with pytest.raises(FileNotFoundError):
        get_clip_embedding("sample_data/non_existent_image.png")
