"""
Unit tests for EasyOCR text extraction module.
"""

from pathlib import Path
import numpy as np
import pytest

from extractors.preprocessing.image_prep import preprocess_image
from extractors.text.ocr import detect_text_regions

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()


def test_detect_text_regions_from_path():
    assert SAMPLE_IMAGE.exists()
    results = detect_text_regions(SAMPLE_IMAGE)
    assert isinstance(results, list)
    for r in results:
        assert "bbox" in r
        assert len(r["bbox"]) == 4
        assert "text" in r
        assert "confidence" in r
        assert isinstance(r["confidence"], float)


def test_detect_text_regions_from_cleaned_array():
    assert SAMPLE_IMAGE.exists()
    cleaned_img = preprocess_image(str(SAMPLE_IMAGE))
    assert isinstance(cleaned_img, np.ndarray)

    results = detect_text_regions(cleaned_img)
    assert isinstance(results, list)
    if len(results) > 0:
        r = results[0]
        assert len(r["bbox"]) == 4
        assert len(r["text"]) > 0


def test_detect_text_regions_file_not_found():
    with pytest.raises(FileNotFoundError):
        detect_text_regions("sample_data/non_existent_image.png")
