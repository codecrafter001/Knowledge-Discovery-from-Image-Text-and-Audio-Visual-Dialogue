# Sample Data Directory

This directory is used to store small samples of data for testing the multimodal extractors during development.

**Please add the following files to this directory:**

1. **`sample_image.png` / `sample_image.jpg`**
   - *Requirement:* A scanned document or a photograph containing clear text and some visual objects.
   - *Used for:* Testing Phase 1 (Image pre-processing) and Phase 2 (OCR, YOLOv8).

2. **`sample_audio.wav` / `sample_audio.mp3`**
   - *Requirement:* A short (30-60 second) recording featuring at least two different speakers having a dialogue.
   - *Used for:* Testing Phase 1 (Audio pre-processing, Speaker Diarization) and Phase 2 (Whisper ASR).

3. **`sample_video.mp4`**
   - *Requirement:* A short video that contains both visual scenes changing (for keyframe extraction) and an audio track with speech.
   - *Used for:* Testing Phase 1 (Scene-boundary detection) and the combined visual/audio pipeline.

Once these files are present, we can begin building and testing the pre-processing pipelines in Phase 1 against real data.
