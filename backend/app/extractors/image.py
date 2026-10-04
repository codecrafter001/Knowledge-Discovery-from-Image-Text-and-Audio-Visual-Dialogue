"""Image extractor: OCR text blocks with bounding boxes, a BLIP caption and a CLIP embedding.

OCR blocks and the caption run through the shared NLP analysis (nlp.py):
- facts from OCR text carry the block's bounding box (percent of image size) and its mean
  Tesseract word confidence;
- facts from the caption carry source "caption" and refer to the whole image. The caption is
  model-generated text with no confidence score.
"""
import shutil
import threading
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

from .. import config
from .nlp import analyze, join_segments

TESSERACT_INSTALL_HELP = (
    "Tesseract OCR was not found. Install it with `winget install UB-Mannheim.TesseractOCR` "
    "(or from https://github.com/UB-Mannheim/tesseract/wiki), then add it to PATH or set "
    "KD_TESSERACT_CMD to the full path of tesseract.exe."
)
DEFAULT_WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")

MIN_WORD_CONFIDENCE = 30  # Tesseract word confidence (0-100); lower is usually noise from graphics
UPSCALE_BELOW_PX = 1500  # upscale small images so text reaches a size Tesseract reads well
MAX_SKEW_DEGREES = 10  # larger estimated angles are more likely layout than skew; left uncorrected

_models: dict[str, tuple] = {}
_models_lock = threading.Lock()


def load_image(path: Path) -> Image.Image:
    with Image.open(path) as img:
        return ImageOps.exif_transpose(img).convert("RGB")


# Preprocessing

def estimate_skew(text_mask: np.ndarray) -> float:
    """Angle in degrees (counter-clockwise positive) of the text pixels' minimum-area rectangle."""
    coords = cv2.findNonZero(text_mask)
    if coords is None or len(coords) < 50:
        return 0.0
    angle = cv2.minAreaRect(coords)[2]
    if angle > 45:
        angle -= 90
    elif angle < -45:
        angle += 90
    return -angle


def preprocess(img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    """Grayscale, upscale, deskew and adaptive-threshold for OCR.

    Returns the binary image (dark text on white) and the 2x3 affine matrix mapping its
    pixel coordinates back to the unrotated, upscaled image.
    """
    gray = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2GRAY)
    scale = max(1.0, UPSCALE_BELOW_PX / max(gray.shape))
    if scale > 1:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    if gray.mean() < 127:  # light text on a dark background
        gray = 255 - gray

    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
    angle = estimate_skew(255 - binary)
    identity = np.array([[1.0, 0, 0], [0, 1.0, 0]])
    if abs(angle) < 0.5 or abs(angle) > MAX_SKEW_DEGREES:
        return binary, identity

    h, w = binary.shape
    rotate = cv2.getRotationMatrix2D((w / 2, h / 2), -angle, 1.0)
    deskewed = cv2.warpAffine(binary, rotate, (w, h), flags=cv2.INTER_NEAREST, borderValue=255)
    return deskewed, cv2.invertAffineTransform(rotate)


def _box_percent(left, top, width, height, to_original: np.ndarray, shape: tuple[int, int]) -> dict:
    corners = np.array([[left, top, 1], [left + width, top, 1], [left, top + height, 1],
                        [left + width, top + height, 1]], dtype=float)
    pts = corners @ to_original.T
    h, w = shape
    x0, y0 = max(float(pts[:, 0].min()), 0), max(float(pts[:, 1].min()), 0)
    x1, y1 = min(float(pts[:, 0].max()), w), min(float(pts[:, 1].max()), h)
    return {
        "x": round(100 * x0 / w, 2),
        "y": round(100 * y0 / h, 2),
        "width": round(100 * (x1 - x0) / w, 2),
        "height": round(100 * (y1 - y0) / h, 2),
    }


# OCR

def _configure_tesseract():
    import pytesseract

    cmd = config.TESSERACT_CMD or shutil.which("tesseract") or (
        str(DEFAULT_WINDOWS_TESSERACT) if DEFAULT_WINDOWS_TESSERACT.exists() else ""
    )
    if not cmd:
        raise RuntimeError(TESSERACT_INSTALL_HELP)
    pytesseract.pytesseract.tesseract_cmd = cmd
    return pytesseract


def tesseract_available() -> bool:
    try:
        _configure_tesseract().get_tesseract_version()
        return True
    except Exception:
        return False


def ocr(img: Image.Image) -> list[dict]:
    """Text blocks (Tesseract paragraphs) with bounding boxes and mean word confidence (0-1)."""
    pytesseract = _configure_tesseract()
    binary, to_original = preprocess(img)
    try:
        data = pytesseract.image_to_data(binary, output_type=pytesseract.Output.DICT, config="--psm 3")
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(TESSERACT_INSTALL_HELP) from exc

    groups: dict[tuple[int, int], list[int]] = {}
    for i, word in enumerate(data["text"]):
        if word.strip() and float(data["conf"][i]) >= MIN_WORD_CONFIDENCE:
            groups.setdefault((data["block_num"][i], data["par_num"][i]), []).append(i)

    blocks = []
    for n, idx in enumerate(groups.values(), 1):
        left = min(data["left"][i] for i in idx)
        top = min(data["top"][i] for i in idx)
        right = max(data["left"][i] + data["width"][i] for i in idx)
        bottom = max(data["top"][i] + data["height"][i] for i in idx)
        blocks.append({
            "id": f"ocr-{n}",
            "text": " ".join(data["text"][i] for i in idx),
            "boundingBox": _box_percent(left, top, right - left, bottom - top, to_original, binary.shape),
            "confidence": round(sum(float(data["conf"][i]) for i in idx) / len(idx) / 100, 2),
        })
    return blocks


# Vision models

def _load(name: str, loader):
    with _models_lock:
        if name not in _models:
            _models[name] = loader()
        return _models[name]


def caption(img: Image.Image) -> str:
    import torch
    from transformers import BlipForConditionalGeneration, BlipProcessor

    processor, model = _load(config.CAPTION_MODEL, lambda: (
        BlipProcessor.from_pretrained(config.CAPTION_MODEL),
        BlipForConditionalGeneration.from_pretrained(config.CAPTION_MODEL).eval(),
    ))
    with torch.inference_mode():
        out = model.generate(**processor(images=img, return_tensors="pt"), max_new_tokens=30)
    return processor.decode(out[0], skip_special_tokens=True).strip()


def clip_embedding(img: Image.Image) -> np.ndarray:
    import torch
    from transformers import CLIPModel, CLIPProcessor

    processor, model = _load(config.CLIP_MODEL, lambda: (
        CLIPProcessor.from_pretrained(config.CLIP_MODEL),
        CLIPModel.from_pretrained(config.CLIP_MODEL).eval(),
    ))
    with torch.inference_mode():
        features = model.get_image_features(**processor(images=img, return_tensors="pt"))
    features = getattr(features, "pooler_output", features)
    vec = features[0].numpy().astype(np.float32)
    return vec / np.linalg.norm(vec)


def save_clip_embedding(doc_id: str, vec: np.ndarray) -> None:
    config.IMAGE_EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
    np.save(config.IMAGE_EMBEDDINGS_DIR / f"{doc_id}.npy", vec)


# Analysis

def build_result(img: Image.Image, blocks: list[dict], caption_text: str) -> dict:
    texts = [
        (b["text"], {"source": "ocr", "blockId": b["id"], "boundingBox": b["boundingBox"],
                     "ocrConfidence": b["confidence"]})
        for b in blocks
    ]
    if caption_text:
        texts.append((caption_text, {"source": "caption"}))
    full_text, segments = join_segments(texts)
    result = analyze(segments)
    return {
        "extractor": f"image/tesseract+{config.CAPTION_MODEL.split('/')[-1]}+spacy:{config.SPACY_MODEL}",
        "fullText": full_text,
        "summary": caption_text or (blocks[0]["text"][:400] if blocks else ""),
        "caption": caption_text,
        "ocrBlocks": blocks,
        "resolution": f"{img.width}x{img.height}",
        **result,
    }
