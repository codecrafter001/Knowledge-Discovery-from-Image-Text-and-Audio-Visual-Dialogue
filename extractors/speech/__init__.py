"""
Speech extraction sub-package for Knowledge Discovery.
"""

from .asr import transcribe, match_speaker_to_segment

__all__ = ["transcribe", "match_speaker_to_segment"]
