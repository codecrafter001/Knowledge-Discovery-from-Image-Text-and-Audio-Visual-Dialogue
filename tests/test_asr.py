"""
Unit tests for Whisper speech recognition with speaker diarization matching.
"""

from pathlib import Path
import pytest

from extractors.speech.asr import transcribe, match_speaker_to_segment

SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


def test_match_speaker_to_segment():
    diarization = [
        {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.5},
        {"speaker": "SPEAKER_01", "start": 2.5, "end": 5.0},
    ]

    # Exact overlap in first window
    spk1 = match_speaker_to_segment(0.5, 2.0, diarization=diarization)
    assert spk1 == "SPEAKER_00"

    # Exact overlap in second window
    spk2 = match_speaker_to_segment(3.0, 4.5, diarization=diarization)
    assert spk2 == "SPEAKER_01"

    # Straddling overlap (majority in second)
    spk3 = match_speaker_to_segment(2.0, 4.0, diarization=diarization)
    assert spk3 == "SPEAKER_01"

    # Empty diarization fallback
    spk_default = match_speaker_to_segment(1.0, 2.0, diarization=None)
    assert spk_default == "SPEAKER_00"


def test_transcribe_with_diarization():
    assert SAMPLE_AUDIO.exists()
    diarization = [
        {"speaker": "SPEAKER_00", "start": 0.0, "end": 2.5},
        {"speaker": "SPEAKER_01", "start": 2.5, "end": 5.0},
    ]
    results = transcribe(str(SAMPLE_AUDIO), diarization=diarization, model_name="tiny")
    assert isinstance(results, list)
    for seg in results:
        assert "speaker" in seg
        assert "start" in seg
        assert "end" in seg
        assert "text" in seg
        assert seg["speaker"] in ["SPEAKER_00", "SPEAKER_01"]


def test_transcribe_file_not_found():
    with pytest.raises(FileNotFoundError):
        transcribe("sample_data/non_existent_audio.wav")
