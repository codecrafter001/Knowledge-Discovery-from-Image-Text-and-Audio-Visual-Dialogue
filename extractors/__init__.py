"""
Multimodal Extractors Module
Provides extraction interfaces for Text (OCR), Vision (YOLO + CLIP), and Speech (Whisper + Diarization).
"""

from .text.ocr import detect_text_regions
from .vision.object_detection import detect_objects, get_clip_embedding
from .speech.asr import transcribe, match_speaker_to_segment
from .preprocessing import preprocess_image, extract_keyframes, preprocess_audio, diarize

__all__ = [
    "detect_text_regions",
    "detect_objects",
    "get_clip_embedding",
    "transcribe",
    "match_speaker_to_segment",
    "preprocess_image",
    "extract_keyframes",
    "preprocess_audio",
    "diarize",
]
