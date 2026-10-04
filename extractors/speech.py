"""
Speech Extraction Module
Performs automated speech recognition (ASR) on audio inputs using OpenAI's Whisper.
Note: Speaker diarization is handled separately in the audio pre-processor.
"""

from typing import Any, Dict
from pathlib import Path
import torch

try:
    import whisper
except ImportError:
    whisper = None

class SpeechExtractor:
    """Speech Extractor for audio transcription."""

    def __init__(self, model_size: str = "base") -> None:
        self.model_size = model_size
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Initializing SpeechExtractor on {self.device}...")
        
        if whisper is None:
            print("Warning: openai-whisper is not installed.")
            self.model = None
        else:
            print(f"Loading Whisper model '{model_size}'...")
            self.model = whisper.load_model(model_size, device=self.device)

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe speech to text with timestamped segments."""
        audio_path = str(audio_path)
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found at {audio_path}")

        if not self.model:
            return {"error": "Whisper model not loaded"}

        # Perform transcription
        # word_timestamps=True provides highly accurate token-level timestamps
        # which is extremely useful for aligning with the diarization segments later.
        result = self.model.transcribe(audio_path, word_timestamps=True)

        segments = []
        for segment in result["segments"]:
            words = []
            if "words" in segment:
                for word in segment["words"]:
                    words.append({
                        "word": word["word"].strip(),
                        "start": word["start"],
                        "end": word["end"],
                        "confidence": word.get("probability", 1.0)
                    })
                    
            segments.append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "words": words
            })

        return {
            "source": audio_path,
            "model_size": self.model_size,
            "text": result["text"].strip(),
            "segments": segments,
            "status": "success"
        }

if __name__ == "__main__":
    # Test script against the sample data
    project_root = Path(__file__).parent.parent
    # We should ideally use the cleaned audio (16kHz mono) from Phase 1
    sample_audio_path = project_root / "sample_data" / "sample_audio_clean.wav"
    
    # Fallback to the raw audio if the cleaned one wasn't generated
    if not sample_audio_path.exists():
        sample_audio_path = project_root / "sample_data" / "sample_audio.wav"
        
    if sample_audio_path.exists():
        extractor = SpeechExtractor(model_size="tiny") # Use 'tiny' for faster testing
        print(f"\nTranscribing {sample_audio_path}...")
        result = extractor.transcribe(str(sample_audio_path))
        
        print("\n--- Full Transcription ---")
        print(result.get("text", "No text found."))
        
        print("\n--- Segments ---")
        for seg in result.get("segments", [])[:3]: # Print first 3 segments
            print(f"[{seg['start']:.2f}s - {seg['end']:.2f}s]: {seg['text']}")
        if len(result.get("segments", [])) > 3:
            print("...")
            
    else:
        print(f"Sample audio not found at {sample_audio_path}")
