"""
FastAPI router for Multimodal Extraction stage endpoints.
Integrates Phase 1 preprocessing with Phase 2 extraction modules.
"""

from pathlib import Path
import os
import shutil
import tempfile
from typing import Optional
import cv2
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from extractors.preprocessing.image_prep import preprocess_image
from extractors.preprocessing.audio_prep import preprocess_audio, diarize
from extractors.text.ocr import detect_text_regions
from extractors.vision.object_detection import detect_objects, get_clip_embedding
from extractors.speech.asr import transcribe

router = APIRouter(prefix="/extract", tags=["extraction"])

TEMP_UPLOAD_DIR = Path(tempfile.gettempdir()) / "kd_extraction_uploads"
TEMP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    languages: Optional[str] = Form("en"),
):
    """
    1. Preprocesses image (denoise, deskew, binarize).
    2. Runs EasyOCR text detection on the cleaned image.
    3. Returns detected bounding boxes, text strings, and confidences.
    """
    filename = file.filename or "uploaded_image.png"
    temp_path = TEMP_UPLOAD_DIR / filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 1: Preprocessing (Phase 1)
        cleaned_array = preprocess_image(str(temp_path))
        stem = temp_path.stem
        suffix = temp_path.suffix or ".png"
        clean_path = temp_path.parent / f"{stem}_clean{suffix}"

        # Step 2: Text Extraction (Phase 2)
        lang_list = [l.strip() for l in languages.split(",") if l.strip()] if languages else ["en"]
        text_regions = detect_text_regions(cleaned_array, languages=lang_list)

        return {
            "status": "ok",
            "filename": filename,
            "clean_image_path": str(clean_path),
            "text_count": len(text_regions),
            "text_regions": text_regions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@router.post("/vision")
async def extract_vision_endpoint(
    file: UploadFile = File(...),
    conf_threshold: float = Form(0.25),
):
    """
    1. Preprocesses image.
    2. Detects objects with YOLOv8.
    3. Computes whole-image normalized CLIP embedding.
    """
    filename = file.filename or "uploaded_image.png"
    temp_path = TEMP_UPLOAD_DIR / filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 1: Preprocessing (Phase 1)
        _ = preprocess_image(str(temp_path))
        stem = temp_path.stem
        suffix = temp_path.suffix or ".png"
        clean_path = temp_path.parent / f"{stem}_clean{suffix}"

        # Step 2: Vision Extraction (Phase 2)
        # Use clean image if exists, else original
        target_path = clean_path if clean_path.exists() else temp_path
        objects = detect_objects(str(target_path), conf_threshold=conf_threshold)
        clip_emb = get_clip_embedding(str(temp_path))

        return {
            "status": "ok",
            "filename": filename,
            "clean_image_path": str(target_path),
            "object_count": len(objects),
            "objects": objects,
            "clip_embedding_dim": int(clip_emb.shape[0]),
            "clip_embedding_sample": [round(float(v), 5) for v in clip_emb[:5]],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision extraction failed: {str(e)}")


@router.post("/speech")
async def extract_speech_endpoint(
    file: UploadFile = File(...),
    whisper_model: str = Form("base"),
    run_diarization: bool = Form(False),
):
    """
    1. Preprocesses audio (resample 16kHz mono, normalize).
    2. Runs optional speaker diarization with pyannote.
    3. Transcribes with Whisper and aligns speaker attribution.
    """
    filename = file.filename or "uploaded_audio.wav"
    temp_path = TEMP_UPLOAD_DIR / filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 1: Preprocessing (Phase 1)
        clean_wav_path = preprocess_audio(str(temp_path))

        # Step 2: Diarization (if requested and HF token present)
        diarization_data = []
        if run_diarization:
            if os.environ.get("HF_TOKEN"):
                diarization_data = diarize(clean_wav_path)
            else:
                # Default single speaker if no HF_TOKEN
                diarization_data = [{"speaker": "SPEAKER_00", "start": 0.0, "end": 600.0}]

        # Step 3: Transcription & Speaker Alignment (Phase 2)
        transcript = transcribe(
            clean_wav_path,
            diarization=diarization_data,
            model_name=whisper_model,
        )

        return {
            "status": "ok",
            "filename": filename,
            "clean_audio_path": clean_wav_path,
            "segment_count": len(transcript),
            "transcript": transcript,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech extraction failed: {str(e)}")
