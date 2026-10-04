"""
Vision extraction module using YOLOv8 for object detection and CLIP for whole-image embeddings.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
from PIL import Image

_YOLO_MODEL = None
_CLIP_MODEL = None
_CLIP_PROCESSOR = None
_OPEN_CLIP_MODEL = None
_OPEN_CLIP_PREPROCESS = None


def get_yolo_model(model_name: str = "yolov8n.pt"):
    """Retrieve or initialize a cached YOLO model."""
    global _YOLO_MODEL
    if _YOLO_MODEL is None:
        try:
            from ultralytics import YOLO
            _YOLO_MODEL = YOLO(model_name)
        except Exception as e:
            raise RuntimeError(f"Failed to load YOLO model '{model_name}': {e}") from e
    return _YOLO_MODEL


def detect_objects(
    image_path: Union[str, Path],
    model_name: str = "yolov8n.pt",
    conf_threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    Detect visual objects in an image using a pretrained YOLOv8 model.

    Args:
        image_path: Path to the image file.
        model_name: Ultralytics YOLO model weight name (default: 'yolov8n.pt').
        conf_threshold: Minimum detection confidence threshold (0.0 to 1.0).

    Returns:
        List of dicts: [{"bbox": [x1, y1, x2, y2], "label": str, "confidence": float}, ...]
    """
    img_path = Path(image_path).resolve()
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found at path: {img_path}")

    model = get_yolo_model(model_name=model_name)
    results = model.predict(source=str(img_path), conf=conf_threshold, verbose=False)

    detections: List[Dict[str, Any]] = []
    if not results or len(results) == 0:
        return detections

    res = results[0]
    boxes = res.boxes
    names = res.names

    if boxes is not None:
        for box in boxes:
            xyxy = box.xyxy[0].tolist()
            cls_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            label = names.get(cls_id, str(cls_id)) if names else str(cls_id)

            x1, y1, x2, y2 = [int(round(coord)) for coord in xyxy]

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "label": str(label),
                "confidence": round(confidence, 4),
            })

    return detections


def get_clip_embedding(
    image_path: Union[str, Path, Image.Image],
    model_name: str = "openai/clip-vit-base-patch32",
) -> np.ndarray:
    """
    Generate a normalized CLIP embedding vector for the whole image.

    Args:
        image_path: Path to the image file or PIL Image instance.
        model_name: HuggingFace or OpenCLIP model identifier.

    Returns:
        1D numpy array representing the normalized image embedding.
    """
    if isinstance(image_path, (str, Path)):
        img_path = Path(image_path).resolve()
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found at path: {img_path}")
        image = Image.open(img_path).convert("RGB")
    elif isinstance(image_path, Image.Image):
        image = image_path.convert("RGB")
    else:
        raise TypeError(f"Expected image_path as str, Path, or PIL Image, got {type(image_path)}")

    # Method 1: Try transformers CLIP first
    global _CLIP_MODEL, _CLIP_PROCESSOR
    try:
        import torch
        from transformers import CLIPModel, CLIPProcessor

        if _CLIP_MODEL is None or _CLIP_PROCESSOR is None:
            _CLIP_PROCESSOR = CLIPProcessor.from_pretrained(model_name)
            _CLIP_MODEL = CLIPModel.from_pretrained(model_name)
            _CLIP_MODEL.eval()

        inputs = _CLIP_PROCESSOR(images=image, return_tensors="pt")
        with torch.no_grad():
            image_features = _CLIP_MODEL.get_image_features(**inputs)
            # Normalize vector to unit length
            norm = torch.linalg.norm(image_features, dim=-1, keepdim=True)
            norm = torch.clamp(norm, min=1e-12)
            normalized_features = image_features / norm
            embedding = normalized_features.squeeze(0).cpu().numpy().astype(np.float32)

        return embedding
    except Exception as e_transformers:
        # Method 2: Fallback to open_clip
        global _OPEN_CLIP_MODEL, _OPEN_CLIP_PREPROCESS
        try:
            import open_clip
            import torch

            if _OPEN_CLIP_MODEL is None or _OPEN_CLIP_PREPROCESS is None:
                _OPEN_CLIP_MODEL, _, _OPEN_CLIP_PREPROCESS = open_clip.create_model_and_transforms(
                    "ViT-B-32", pretrained="laion2b_s34b_b79k"
                )
                _OPEN_CLIP_MODEL.eval()

            image_tensor = _OPEN_CLIP_PREPROCESS(image).unsqueeze(0)
            with torch.no_grad():
                image_features = _OPEN_CLIP_MODEL.encode_image(image_tensor)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                embedding = image_features.squeeze(0).cpu().numpy().astype(np.float32)

            return embedding
        except Exception as e_openclip:
            raise RuntimeError(
                f"Failed to generate CLIP embedding via transformers ({e_transformers}) "
                f"and open_clip ({e_openclip})"
            ) from e_transformers
