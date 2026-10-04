"""
Unit tests for video keyframe extraction.
"""

from pathlib import Path
import pytest

from extractors.preprocessing.video_prep import extract_keyframes

SAMPLE_VIDEO = Path("sample_data/sample_video.mp4").resolve()


def test_extract_keyframes(tmp_path):
    assert SAMPLE_VIDEO.exists(), "Sample video must exist for testing"

    out_dir = tmp_path / "keyframes"
    keyframes = extract_keyframes(str(SAMPLE_VIDEO), str(out_dir))

    assert isinstance(keyframes, list)
    assert len(keyframes) >= 1, "At least one keyframe should be extracted"

    for kf in keyframes:
        assert "timestamp" in kf
        assert "frame_path" in kf
        assert isinstance(kf["timestamp"], float)
        assert Path(kf["frame_path"]).exists(), "Keyframe file must exist on disk"
        assert Path(kf["frame_path"]).suffix in [".jpg", ".png"]


def test_extract_keyframes_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError):
        extract_keyframes("non_existent_video.mp4", str(tmp_path))
