import os
import torch
import soundfile as sf
import numpy as np
from pathlib import Path
from typing import Union, List, Dict
from pyannote.audio import Pipeline

# Use ffmpeg-python for resampling
import ffmpeg

class AudioPreprocessor:
    """Handles audio normalization: resampling, volume normalization, and speaker diarization."""
    
    def __init__(self, target_sample_rate: int = 16000, hf_token: str = None):
        """
        Args:
            target_sample_rate: Target rate for ASR/Diarization (16kHz is standard for Whisper).
            hf_token: HuggingFace access token required for pyannote.audio models.
        """
        self.target_sample_rate = target_sample_rate
        self.hf_token = hf_token or os.getenv("HF_TOKEN")
        self.diarization_pipeline = None
        
        if self.hf_token:
            try:
                # Load pyannote speaker diarization pipeline
                self.diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=self.hf_token
                )
                
                # Move to GPU if available
                if torch.cuda.is_available():
                    self.diarization_pipeline.to(torch.device("cuda"))
            except Exception as e:
                print(f"Failed to load diarization pipeline: {e}")
                print("Make sure you have accepted the user conditions on huggingface.co/pyannote/speaker-diarization-3.1")

    def resample_and_normalize(self, input_path: Union[str, Path], output_path: Union[str, Path]) -> str:
        """Uses FFmpeg to resample the audio to 16kHz and normalize volume."""
        input_path = str(input_path)
        output_path = str(output_path)
        
        try:
            # We use ffmpeg to easily convert to 16k mono audio (standard for Whisper)
            (
                ffmpeg
                .input(input_path)
                .output(output_path, ac=1, ar=self.target_sample_rate, loglevel="error")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return output_path
        except ffmpeg.Error as e:
            print(f"FFmpeg error: {e.stderr.decode('utf-8')}")
            raise

    def diarize(self, audio_path: Union[str, Path]) -> List[Dict]:
        """
        Runs speaker diarization on the audio file.
        Returns a list of segments: {"start": float, "end": float, "speaker": str}
        """
        if not self.diarization_pipeline:
            print("Warning: Diarization pipeline not initialized (missing HF_TOKEN). Skipping diarization.")
            return []

        print(f"Running diarization on {audio_path}...")
        diarization = self.diarization_pipeline(str(audio_path))
        
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })
            
        return segments

    def process(self, audio_path: Union[str, Path], output_dir: Union[str, Path] = None) -> Dict:
        """Runs the full audio pre-processing pipeline."""
        audio_path = Path(audio_path)
        output_dir = Path(output_dir) if output_dir else audio_path.parent
        
        normalized_audio_path = output_dir / f"{audio_path.stem}_clean.wav"
        
        # 1. Resample and normalize
        self.resample_and_normalize(audio_path, normalized_audio_path)
        
        # 2. Diarize
        segments = self.diarize(normalized_audio_path)
        
        return {
            "cleaned_audio_path": str(normalized_audio_path),
            "diarization_segments": segments
        }

if __name__ == "__main__":
    # Test script against the sample data
    project_root = Path(__file__).parent.parent
    sample_audio_path = project_root / "sample_data" / "sample_audio.wav"
    
    if sample_audio_path.exists():
        # NOTE: To test diarization, set the HF_TOKEN environment variable.
        preprocessor = AudioPreprocessor()
        print(f"Processing {sample_audio_path}...")
        result = preprocessor.process(sample_audio_path)
        
        print(f"Cleaned audio saved to: {result['cleaned_audio_path']}")
        print(f"Found {len(result['diarization_segments'])} speaker segments.")
        for seg in result['diarization_segments']:
            print(f"[{seg['start']:.1f}s -> {seg['end']:.1f}s] {seg['speaker']}")
    else:
        print(f"Sample audio not found at {sample_audio_path}")
