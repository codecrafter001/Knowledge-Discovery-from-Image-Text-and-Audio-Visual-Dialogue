"""
Speech recognition (ASR) module using OpenAI Whisper with speaker attribution.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np

try:
    import soundfile as sf
except ImportError:
    sf = None

try:
    from scipy.io import wavfile
    from scipy import signal
except ImportError:
    wavfile = None
    signal = None

_WHISPER_MODEL = None


def get_whisper_model(model_name: str = "base"):
    """Retrieve or initialize a cached Whisper ASR model."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        try:
            import whisper
            _WHISPER_MODEL = whisper.load_model(model_name)
        except Exception as e:
            raise RuntimeError(f"Failed to load Whisper model '{model_name}': {e}") from e
    return _WHISPER_MODEL


def load_audio_waveform(audio_path: Union[str, Path], target_sr: int = 16000) -> np.ndarray:
    """
    Load an audio file into a 16kHz mono float32 numpy array without requiring system FFmpeg binary.
    """
    path = Path(audio_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found at path: {path}")

    audio = None
    sr = None

    if sf is not None:
        try:
            audio, sr = sf.read(str(path), dtype="float32")
        except Exception:
            pass

    if audio is None and wavfile is not None:
        try:
            sr, raw_audio = wavfile.read(str(path))
            if raw_audio.dtype == np.int16:
                audio = raw_audio.astype(np.float32) / 32768.0
            elif raw_audio.dtype == np.int32:
                audio = raw_audio.astype(np.float32) / 2147483648.0
            elif raw_audio.dtype == np.uint8:
                audio = (raw_audio.astype(np.float32) - 128.0) / 128.0
            else:
                audio = raw_audio.astype(np.float32)
        except Exception:
            pass

    if audio is None:
        # Fallback to whisper.load_audio
        import whisper
        return whisper.load_audio(str(path))

    # Convert multi-channel (stereo) to mono
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # Resample to target_sr if necessary
    if sr is not None and sr != target_sr:
        if signal is not None:
            num_samples = int(len(audio) * target_sr / sr)
            audio = signal.resample(audio, num_samples)

    return audio.astype(np.float32)


def match_speaker_to_segment(
    seg_start: float,
    seg_end: float,
    diarization: Optional[List[Dict[str, Any]]] = None,
    default_speaker: str = "SPEAKER_00",
) -> str:
    """
    Find the speaker label with the highest temporal overlap with [seg_start, seg_end].

    Args:
        seg_start: Segment start time in seconds.
        seg_end: Segment end time in seconds.
        diarization: List of dicts with 'speaker', 'start', 'end'.
        default_speaker: Fallback label if no overlap or empty diarization.

    Returns:
        Speaker string (e.g. 'SPEAKER_01').
    """
    if not diarization:
        return default_speaker

    best_speaker = default_speaker
    max_overlap = 0.0

    for d in diarization:
        d_start = float(d.get("start", 0.0))
        d_end = float(d.get("end", 0.0))
        speaker = str(d.get("speaker", default_speaker))

        overlap = max(0.0, min(seg_end, d_end) - max(seg_start, d_start))
        if overlap > max_overlap:
            max_overlap = overlap
            best_speaker = speaker

    # If no strict overlap but diarization exists, pick closest span
    if max_overlap == 0.0 and diarization:
        mid_point = (seg_start + seg_end) / 2.0
        closest_d = min(
            diarization,
            key=lambda d: abs(((float(d.get("start", 0.0)) + float(d.get("end", 0.0))) / 2.0) - mid_point)
        )
        best_speaker = str(closest_d.get("speaker", default_speaker))

    return best_speaker


def transcribe(
    audio_path: Union[str, Path, np.ndarray],
    diarization: Optional[List[Dict[str, Any]]] = None,
    model_name: str = "base",
    language: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Transcribe audio with OpenAI Whisper and attribute segments to speakers from diarization.

    Args:
        audio_path: Path to cleaned audio file (or 1D float32 numpy array).
        diarization: Speaker diarization list from pyannote [{"speaker": ..., "start": ..., "end": ...}].
        model_name: Whisper model size ('tiny', 'base', 'small', 'medium', 'large').
        language: Optional language code ('en', etc.).

    Returns:
        List of speaker-attributed segments:
        [{"speaker": str, "start": float, "end": float, "text": str}, ...]
    """
    if isinstance(audio_path, np.ndarray):
        audio_input = audio_path.astype(np.float32)
    else:
        path = Path(audio_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found at path: {path}")
        audio_input = load_audio_waveform(path)

    model = get_whisper_model(model_name=model_name)

    transcribe_options: Dict[str, Any] = {"fp16": False, "verbose": False}
    if language:
        transcribe_options["language"] = language

    result = model.transcribe(audio_input, **transcribe_options)
    raw_segments = result.get("segments", [])

    attributed_segments: List[Dict[str, Any]] = []

    if not raw_segments:
        full_text = result.get("text", "").strip()
        if full_text:
            speaker = match_speaker_to_segment(0.0, 1.0, diarization=diarization)
            attributed_segments.append({
                "speaker": speaker,
                "start": 0.0,
                "end": 0.0,
                "text": full_text,
            })
        return attributed_segments

    for seg in raw_segments:
        start_t = round(float(seg.get("start", 0.0)), 3)
        end_t = round(float(seg.get("end", 0.0)), 3)
        text = str(seg.get("text", "")).strip()

        speaker = match_speaker_to_segment(start_t, end_t, diarization=diarization)

        attributed_segments.append({
            "speaker": speaker,
            "start": start_t,
            "end": end_t,
            "text": text,
        })

    return attributed_segments
