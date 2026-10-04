"""
Unit tests for audio preprocessing and diarization.
"""

import os
from pathlib import Path
import numpy as np
import pytest

from extractors.preprocessing.audio_prep import preprocess_audio, diarize

try:
    import soundfile as sf
except ImportError:
    sf = None

try:
    from scipy.io import wavfile
except ImportError:
    wavfile = None

SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


def test_preprocess_audio(tmp_path):
    assert SAMPLE_AUDIO.exists(), "Sample audio must exist for testing"

    out_file = tmp_path / "cleaned_audio.wav"
    result_path = preprocess_audio(str(SAMPLE_AUDIO), output_path=str(out_file))

    assert Path(result_path).exists()

    # Verify audio properties: 16kHz mono, normalized
    if sf is not None:
        data, sr = sf.read(result_path)
        assert sr == 16000
        assert data.ndim == 1  # Mono
        assert np.max(np.abs(data)) <= 1.0
    elif wavfile is not None:
        sr, data = wavfile.read(result_path)
        assert sr == 16000
        assert data.ndim == 1


def test_diarize_missing_token_raises_error():
    # Ensure HF_TOKEN is unset for this test
    old_token = os.environ.pop("HF_TOKEN", None)
    try:
        with pytest.raises(ValueError) as excinfo:
            diarize(str(SAMPLE_AUDIO))
        assert "HuggingFace authentication token is missing" in str(excinfo.value)
        assert "HF_TOKEN" in str(excinfo.value)
    finally:
        if old_token is not None:
            os.environ["HF_TOKEN"] = old_token


def test_preprocess_audio_file_not_found():
    with pytest.raises(FileNotFoundError):
        preprocess_audio("non_existent_audio.wav")
