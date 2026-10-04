"""
FastAPI router for Multimodal Late Fusion endpoints.
Exposes POST /fuse for end-to-end multimodal entity reconciliation.
"""

from pathlib import Path
import shutil
import tempfile
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from fusion.pipeline import fuse

router = APIRouter(tags=["fusion"])

TEMP_FUSION_DIR = Path(tempfile.gettempdir()) / "kd_fusion_uploads"
TEMP_FUSION_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/fuse")
async def fuse_endpoint(
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    whisper_model: str = Form("base"),
    yolo_conf_threshold: float = Form(0.25),
):
    """
    End-to-end multimodal fusion endpoint.
    Accepts an image and/or audio file, processes through extraction, NLU, and reconciles entities across modalities.
    """
    if not image and not audio:
        raise HTTPException(
            status_code=400, detail="At least one modality ('image' or 'audio') must be provided."
        )

    saved_image_path = None
    saved_audio_path = None

    try:
        if image and image.filename:
            saved_image_path = TEMP_FUSION_DIR / image.filename
            with open(saved_image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)

        if audio and audio.filename:
            saved_audio_path = TEMP_FUSION_DIR / audio.filename
            with open(saved_audio_path, "wb") as buffer:
                shutil.copyfileobj(audio.file, buffer)

        reconciled = fuse(
            image_path=str(saved_image_path) if saved_image_path else None,
            audio_path=str(saved_audio_path) if saved_audio_path else None,
            whisper_model=whisper_model,
            yolo_conf_threshold=yolo_conf_threshold,
        )

        return {
            "status": "ok",
            "image_provided": bool(saved_image_path),
            "audio_provided": bool(saved_audio_path),
            "entity_count": len(reconciled),
            "reconciled_entities": reconciled,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multimodal fusion failed: {str(e)}")
