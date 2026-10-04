"""
Audio Preprocessing Module
Resamples audio to 16kHz mono, normalizes amplitude, and performs speaker diarization via pyannote.audio.
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
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


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """
    Resample 1D audio numpy array from orig_sr to target_sr.
    """
    if orig_sr == target_sr:
        return audio
    if signal is not None:
        num_samples = int(len(audio) * float(target_sr) / orig_sr)
        return signal.resample(audio, num_samples).astype(np.float32)
    else:
        # Linear interpolation fallback if scipy is unavailable
        duration = len(audio) / orig_sr
        target_len = int(duration * target_sr)
        orig_indices = np.linspace(0, len(audio) - 1, len(audio))
        target_indices = np.linspace(0, len(audio) - 1, target_len)
        return np.interp(target_indices, orig_indices, audio).astype(np.float32)


def normalize_amplitude(audio: np.ndarray, target_peak: float = 0.95) -> np.ndarray:
    """
    Normalize audio array to target peak amplitude.
    """
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        return (audio / max_val * target_peak).astype(np.float32)
    return audio.astype(np.float32)


def preprocess_audio(audio_path: str, output_path: Optional[str] = None) -> str:
    """
    Preprocess an audio file:
    1. Load audio (multi-format support)
    2. Convert stereo/multichannel to mono
    3. Resample to 16,000 Hz
    4. Normalize amplitude to [-0.95, +0.95]
    5. Save cleaned .wav file alongside original with '_clean.wav' suffix

    Args:
        audio_path: Path to the input audio file.
        output_path: Optional explicit output path.

    Returns:
        Path to the saved cleaned .wav file.
    """
    path = Path(audio_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Load audio
    data: Optional[np.ndarray] = None
    sr: int = 16000

    if sf is not None:
        try:
            data, sr = sf.read(str(path), dtype="float32")
        except Exception:
            pass

    if data is None and wavfile is not None:
        try:
            sr, raw_data = wavfile.read(str(path))
            if raw_data.dtype == np.int16:
                data = raw_data.astype(np.float32) / 32768.0
            elif raw_data.dtype == np.int32:
                data = raw_data.astype(np.float32) / 2147483648.0
            elif raw_data.dtype == np.uint8:
                data = (raw_data.astype(np.float32) - 128.0) / 128.0
            else:
                data = raw_data.astype(np.float32)
        except Exception as e:
            raise ValueError(f"Could not read audio file at {audio_path}: {e}")

    if data is None:
        raise ValueError(f"Unable to decode audio format for {audio_path}")

    # Convert to mono if stereo/multichannel
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    # Resample to 16kHz
    if sr != 16000:
        data = resample_audio(data, sr, 16000)
        sr = 16000

    # Normalize amplitude
    data = normalize_amplitude(data)

    # Determine output path
    if output_path:
        out_file = Path(output_path).resolve()
    else:
        out_file = path.parent / f"{path.stem}_clean.wav"

    out_file.parent.mkdir(parents=True, exist_ok=True)

    # Write 16kHz 16-bit PCM WAV
    if sf is not None:
        sf.write(str(out_file), data, sr, subtype="PCM_16")
    elif wavfile is not None:
        int16_data = (data * 32767.0).astype(np.int16)
        wavfile.write(str(out_file), sr, int16_data)
    else:
        raise RuntimeError("No audio writer library (soundfile/scipy) available")

    return str(out_file)


def diarize(audio_path: str, hf_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Perform speaker diarization using pyannote.audio.

    Requires a HuggingFace authentication token via parameter or HF_TOKEN env var.

    Args:
        audio_path: Path to audio file.
        hf_token: Optional token override.

    Returns:
        List of dicts: [{"speaker": str, "start": float, "end": float}, ...]
    """
    path = Path(audio_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    token = hf_token or os.getenv("HF_TOKEN")
    if not token or not token.strip():
        raise ValueError(
            "HuggingFace authentication token is missing. Please set the HF_TOKEN environment variable."
        )

    try:
        from pyannote.audio import Pipeline
    except ImportError:
        raise ImportError(
            "pyannote.audio is not installed. Please install it with 'pip install pyannote.audio'."
        )

    # Initialize pretrained diarization pipeline
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=token.strip()
    )

    if pipeline is None:
        raise RuntimeError(
            "Failed to load pyannote/speaker-diarization-3.1 pipeline. Ensure token has access permissions."
        )

    diarization = pipeline(str(path))

    results: List[Dict[str, Any]] = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        results.append({
            "speaker": str(speaker),
            "start": round(turn.start, 3),
            "end": round(turn.end, 3)
        })

    return results
