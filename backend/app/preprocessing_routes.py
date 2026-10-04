"""
Preprocessing API Router
Provides manual testing endpoints for image, video, and audio preprocessing.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from extractors.preprocessing import (
    preprocess_image,
    extract_keyframes,
    preprocess_audio,
    diarize,
)

router = APIRouter(prefix="/preprocess", tags=["Preprocessing"])

# Ensure uploads/preprocess temp folder exists
UPLOAD_PREP_DIR = Path("storage/uploads/preprocessing").resolve()
UPLOAD_PREP_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/image")
async def api_preprocess_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload and preprocess an image (denoise, deskew, binarize).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix or ".png"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, dir=str(UPLOAD_PREP_DIR))
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        # Run preprocessing
        cleaned_array = preprocess_image(temp_file.name, save_clean=True)
        clean_path = str(Path(temp_file.name).parent / f"{Path(temp_file.name).stem}_clean{file_ext}")

        return {
            "status": "ok",
            "filename": file.filename,
            "original_path": temp_file.name,
            "clean_path": clean_path,
            "dimensions": {
                "height": int(cleaned_array.shape[0]),
                "width": int(cleaned_array.shape[1])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image preprocessing failed: {str(e)}")


@router.post("/video")
async def api_preprocess_video(
    file: UploadFile = File(...),
    threshold: float = Form(0.3)
) -> Dict[str, Any]:
    """
    Upload a video, detect scene changes, and extract one keyframe per scene.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix or ".mp4"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, dir=str(UPLOAD_PREP_DIR))
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        keyframes_dir = UPLOAD_PREP_DIR / f"{Path(temp_file.name).stem}_keyframes"
        keyframes_dir.mkdir(parents=True, exist_ok=True)

        keyframes = extract_keyframes(temp_file.name, str(keyframes_dir), threshold=threshold)

        return {
            "status": "ok",
            "filename": file.filename,
            "original_path": temp_file.name,
            "keyframe_count": len(keyframes),
            "keyframes": keyframes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video preprocessing failed: {str(e)}")


@router.post("/audio")
async def api_preprocess_audio(
    file: UploadFile = File(...),
    run_diarization: bool = Form(False)
) -> Dict[str, Any]:
    """
    Upload and preprocess an audio file (resample to 16kHz mono, normalize amplitude),
    and optionally run speaker diarization with pyannote.audio if HF_TOKEN is configured.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix or ".wav"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, dir=str(UPLOAD_PREP_DIR))
    try:
        content = await file.read()
        temp_file.write(content)
        temp_file.close()

        # Run audio resampling & normalization
        clean_audio_path = preprocess_audio(temp_file.name)

        diarization_results = []
        diarization_status = "skipped"

        if run_diarization:
            hf_token = os.getenv("HF_TOKEN")
            if not hf_token:
                diarization_status = "error: HF_TOKEN environment variable is not set"
            else:
                try:
                    diarization_results = diarize(clean_audio_path, hf_token=hf_token)
                    diarization_status = "completed"
                except Exception as de:
                    diarization_status = f"error: {str(de)}"

        return {
            "status": "ok",
            "filename": file.filename,
            "original_path": temp_file.name,
            "clean_audio_path": clean_audio_path,
            "sample_rate": 16000,
            "channels": 1,
            "diarization_status": diarization_status,
            "diarization": diarization_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio preprocessing failed: {str(e)}")
