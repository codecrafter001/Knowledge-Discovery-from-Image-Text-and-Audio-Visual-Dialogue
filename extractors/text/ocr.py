"""
Text extraction module using EasyOCR.
Detects text regions, coordinates, text transcriptions, and confidence scores from images.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
import cv2

_EASYOCR_READER = None


def get_ocr_reader(languages: Optional[List[str]] = None, gpu: bool = False):
    """Retrieve or initialize a cached EasyOCR reader instance."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            langs = languages or ["en"]
            _EASYOCR_READER = easyocr.Reader(langs, gpu=gpu)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize EasyOCR reader: {e}") from e
    return _EASYOCR_READER


def detect_text_regions(
    image: Union[np.ndarray, str, Path],
    languages: Optional[List[str]] = None,
    gpu: bool = False,
    min_confidence: float = 0.0,
) -> List[Dict[str, Any]]:
    """
    Detect text regions and transcribe text from an image or cleaned image array.

    Args:
        image: A numpy array (e.g. from preprocess_image) or a path to an image file.
        languages: Language codes to detect (defaults to ['en']).
        gpu: Whether to use GPU acceleration for OCR inference.
        min_confidence: Minimum confidence threshold (0.0 to 1.0) to include in results.

    Returns:
        List of dicts: [{"bbox": [x1, y1, x2, y2], "text": str, "confidence": float}, ...]
    """
    # Load or format image into acceptable format for EasyOCR
    if isinstance(image, (str, Path)):
        img_path = Path(image).resolve()
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found at path: {img_path}")
        img_input = str(img_path)
    elif isinstance(image, np.ndarray):
        # If binary/grayscale (2D), convert to 3-channel RGB for EasyOCR
        if image.ndim == 2:
            img_input = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.ndim == 3 and image.shape[2] == 4:
            img_input = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif image.ndim == 3 and image.shape[2] == 3:
            img_input = image
        else:
            raise ValueError(f"Unsupported image array shape: {image.shape}")
    else:
        raise TypeError(f"Expected image as np.ndarray, str, or Path, got {type(image)}")

    reader = get_ocr_reader(languages=languages, gpu=gpu)
    raw_results = reader.readtext(img_input)

    text_regions: List[Dict[str, Any]] = []
    for item in raw_results:
        # EasyOCR returns (bbox_points, text, confidence)
        # bbox_points is [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        points, text, confidence = item
        confidence = float(confidence)
        if confidence < min_confidence:
            continue

        xs = [pt[0] for pt in points]
        ys = [pt[1] for pt in points]
        x1, y1 = int(round(min(xs))), int(round(min(ys)))
        x2, y2 = int(round(max(xs))), int(round(max(ys)))

        text_regions.append({
            "bbox": [x1, y1, x2, y2],
            "text": str(text).strip(),
            "confidence": round(confidence, 4),
        })

    return text_regions
