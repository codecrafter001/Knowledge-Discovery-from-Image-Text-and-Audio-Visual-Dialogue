"""
Unit tests for image preprocessing.
"""

from pathlib import Path
import numpy as np
import pytest

from extractors.preprocessing.image_prep import (
    preprocess_image,
    compute_skew_angle,
    deskew_image,
    denoise_image,
    binarize_image,
)

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()


def test_preprocess_image_returns_binary_array(tmp_path):
    assert SAMPLE_IMAGE.exists(), "Sample image must exist for testing"

    # Copy sample image to temp directory to test output generation
    import shutil
    test_img = tmp_path / "test_doc.png"
    shutil.copy(SAMPLE_IMAGE, test_img)

    result = preprocess_image(str(test_img), save_clean=True)

    # Verify return type and properties
    assert isinstance(result, np.ndarray)
    assert len(result.shape) == 2  # Grayscale/Binary 2D
    assert result.dtype == np.uint8
    assert result.shape[0] > 0 and result.shape[1] > 0

    # Verify binarization (only 0 and 255 values present)
    unique_vals = set(np.unique(result))
    assert unique_vals.issubset({0, 255})

    # Verify _clean file was saved alongside original
    clean_file = tmp_path / "test_doc_clean.png"
    assert clean_file.exists(), "Cleaned image file should be saved alongside original"


def test_preprocess_image_file_not_found():
    with pytest.raises(FileNotFoundError):
        preprocess_image("non_existent_file.png")
