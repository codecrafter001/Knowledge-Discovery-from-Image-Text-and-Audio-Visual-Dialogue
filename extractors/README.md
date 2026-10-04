# Multimodal Extractors Module

This directory contains extractor modules for parsing different modalities:

- **`ocr.py`**: Optical Character Recognition (`pytesseract`, `easyocr`) for scanned pages, diagrams, and PDF figures.
- **`vision.py`**: Visual embeddings and captioning (`transformers`, CLIP, BLIP) for images and chart visual analysis.
- **`speech.py`**: Speech-to-text transcription and diarization (`openai-whisper`, `pyannote.audio`).
