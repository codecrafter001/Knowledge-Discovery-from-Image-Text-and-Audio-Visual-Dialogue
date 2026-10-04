"""
End-to-End Multimodal Late Fusion Pipeline.
Coordinates Pre-processing, Extraction, Language Understanding, and Entity Reconciliation.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np

# Phase 1: Pre-processing
from extractors.preprocessing.image_prep import preprocess_image
from extractors.preprocessing.audio_prep import preprocess_audio

# Phase 2: Extraction
from extractors.text.ocr import detect_text_regions
from extractors.vision.object_detection import detect_objects, get_clip_embedding
from extractors.speech.asr import transcribe

# Phase 3: Language Understanding
from nlu.coreference import resolve_coreferences
from nlu.entities import extract_entities

# Phase 4: Fusion & Reconciliation
from .reconcile import reconcile_entities


def fuse(
    image_path: Optional[Union[str, Path]] = None,
    audio_path: Optional[Union[str, Path]] = None,
    whisper_model: str = "base",
    yolo_conf_threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    End-to-End Multimodal Fusion pipeline.
    Ingests an image and/or audio file, runs preprocessing, extraction, NLU, and reconciles entities.

    Args:
        image_path: Path to image file (optional if only audio provided).
        audio_path: Path to audio file (optional if only image provided).
        whisper_model: Whisper model size for ASR ('tiny', 'base', etc.).
        yolo_conf_threshold: Minimum detection confidence for visual object detector.

    Returns:
        List of reconciled multimodal entities:
        [
          {
            "canonical_name": str,
            "sources": ["image_text", "speech", ...],
            "confidence": float,
            "evidence": [...],
            ...
          }
        ]
    """
    all_raw_entities: List[Dict[str, Any]] = []

    # -------------------------------------------------------------
    # 1. Process Image Modality (OCR Text & Vision Objects)
    # -------------------------------------------------------------
    if image_path:
        img_p = Path(image_path).resolve()
        if img_p.exists():
            # Step 1A: Preprocess Image (Phase 1)
            cleaned_img_array = preprocess_image(str(img_p))

            # Step 1B: Text Extraction (EasyOCR)
            ocr_regions = detect_text_regions(cleaned_img_array)

            # Concatenate OCR texts for NLU coreference & entity extraction
            full_ocr_text = " ".join(r["text"] for r in ocr_regions if r.get("text"))
            if full_ocr_text:
                resolved_ocr_text = resolve_coreferences(full_ocr_text)
                ocr_named_entities = extract_entities(resolved_ocr_text)

                for ent in ocr_named_entities:
                    # Match entity text to closest OCR region bbox
                    ent_text = ent["text"].lower()
                    matched_bbox = None
                    matched_conf = 0.85
                    for reg in ocr_regions:
                        if ent_text in reg["text"].lower() or reg["text"].lower() in ent_text:
                            matched_bbox = reg.get("bbox")
                            matched_conf = float(reg.get("confidence", 0.85))
                            break

                    all_raw_entities.append({
                        "canonical_name": ent["text"],
                        "text": ent["text"],
                        "label": ent.get("label", "ENTITY"),
                        "source": "image_text",
                        "bbox": matched_bbox,
                        "confidence": matched_conf,
                    })

            # If no named entities found via spaCy, treat text blocks as text entities
            if not ocr_named_entities and ocr_regions:
                for reg in ocr_regions:
                    if reg.get("text"):
                        all_raw_entities.append({
                            "canonical_name": reg["text"],
                            "text": reg["text"],
                            "label": "TEXT_BLOCK",
                            "source": "image_text",
                            "bbox": reg.get("bbox"),
                            "confidence": float(reg.get("confidence", 0.80)),
                        })

            # Step 1C: Visual Object Detection (YOLOv8)
            detected_objects = detect_objects(str(img_p), conf_threshold=yolo_conf_threshold)
            for obj in detected_objects:
                all_raw_entities.append({
                    "canonical_name": obj["label"],
                    "text": obj["label"],
                    "label": obj["label"],
                    "source": "vision",
                    "bbox": obj.get("bbox"),
                    "confidence": float(obj.get("confidence", 0.75)),
                })

    # -------------------------------------------------------------
    # 2. Process Audio Modality (Speech ASR + NLU)
    # -------------------------------------------------------------
    if audio_path:
        aud_p = Path(audio_path).resolve()
        if aud_p.exists():
            # Step 2A: Preprocess Audio (Phase 1)
            clean_audio_path = preprocess_audio(str(aud_p))

            # Step 2B: Speech Transcription (Whisper ASR)
            transcript_segments = transcribe(clean_audio_path, model_name=whisper_model)

            # Step 2C: Language Understanding on Transcript (NLU)
            for seg in transcript_segments:
                seg_text = seg.get("text", "").strip()
                if not seg_text:
                    continue

                resolved_seg_text = resolve_coreferences(seg_text)
                seg_entities = extract_entities(resolved_seg_text)

                if seg_entities:
                    for ent in seg_entities:
                        all_raw_entities.append({
                            "canonical_name": ent["text"],
                            "text": ent["text"],
                            "label": ent.get("label", "ENTITY"),
                            "source": "speech",
                            "start_time": seg.get("start"),
                            "end_time": seg.get("end"),
                            "speaker": seg.get("speaker", "SPEAKER_00"),
                            "confidence": 0.90,
                        })
                else:
                    # Fallback to segment text mention
                    all_raw_entities.append({
                        "canonical_name": seg_text,
                        "text": seg_text,
                        "label": "SPEECH_UTTERANCE",
                        "source": "speech",
                        "start_time": seg.get("start"),
                        "end_time": seg.get("end"),
                        "speaker": seg.get("speaker", "SPEAKER_00"),
                        "confidence": 0.80,
                    })

    # -------------------------------------------------------------
    # 3. Late Multimodal Reconciliation
    # -------------------------------------------------------------
    reconciled_entities = reconcile_entities(all_raw_entities)
    return reconciled_entities
