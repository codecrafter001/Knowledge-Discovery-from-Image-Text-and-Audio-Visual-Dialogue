import io
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageFont

from app.extractors import image

API = "/api/v1"
TEXT = "Ada Lovelace wrote the first algorithm."
TEXT_XY = (120, 160)

needs_tesseract = pytest.mark.skipif(not image.tesseract_available(), reason="Tesseract OCR not installed")


def _font(size=44):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def _slide(text=TEXT) -> tuple[Image.Image, tuple[int, int, int, int]]:
    img = Image.new("RGB", (1400, 700), "white")
    draw = ImageDraw.Draw(img)
    draw.text(TEXT_XY, text, fill="black", font=_font())
    return img, draw.textbbox(TEXT_XY, text, font=_font())


def _png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def fake_vision(monkeypatch):
    """Replace BLIP and CLIP so tests don't download or run the vision models."""
    monkeypatch.setattr(image, "caption", lambda img: "a white slide with black text")
    monkeypatch.setattr(image, "clip_embedding", lambda img: np.ones(512, dtype=np.float32) / np.sqrt(512))


def test_estimate_skew_recovers_rotation():
    img, _ = _slide()
    for angle in (4, -4):
        gray = np.asarray(img.rotate(angle, fillcolor="white").convert("L"))
        assert image.estimate_skew((gray < 128).astype(np.uint8) * 255) == pytest.approx(angle, abs=0.5)


@needs_tesseract
def test_ocr_block_box_covers_drawn_text():
    img, (left, top, right, bottom) = _slide()
    blocks = image.ocr(img)
    assert [b["text"] for b in blocks] == [TEXT]
    box = blocks[0]["boundingBox"]
    x0, y0 = box["x"] / 100 * img.width, box["y"] / 100 * img.height
    x1, y1 = x0 + box["width"] / 100 * img.width, y0 + box["height"] / 100 * img.height
    margin = 6  # px: glyph bounds vs. font metrics
    assert left - margin <= x0 and x1 <= right + margin
    assert top - margin <= y0 and y1 <= bottom + margin
    assert (x1 - x0) > 0.9 * (right - left)  # box covers the whole line
    assert 0.5 < blocks[0]["confidence"] <= 1


@needs_tesseract
def test_image_upload_extracts_triple_with_box_evidence(client, upload, fake_vision):
    img, _ = _slide()
    doc = upload("slide.png", _png(img))
    assert doc["status"] == "completed", doc["summary"]
    assert doc["summary"] == "a white slide with black text"
    assert doc["metadata"]["resolution"] == "1400x700"
    assert doc["thumbnailUrl"] == doc["contentUrl"]

    (box,) = doc["boundingBoxes"]
    assert box["label"].startswith("Ada Lovelace")
    assert box["entityId"]

    triplet = next(t for t in client.get(f"{API}/triplets").json()
                   if t["sourceDocId"] == doc["id"] and t["predicate"] == "write")
    assert triplet["subjectName"] == "Ada Lovelace"
    assert triplet["evidenceSource"] == "ocr"
    assert triplet["boundingBox"]["x"] == box["x"]

    ev = next(e for e in client.get(f"{API}/evidence").json() if e["tripletId"] == triplet["id"])
    assert ev["imageUrl"] == doc["contentUrl"]
    assert ev["boundingBox"]["id"] == box["id"]
    assert ev["asrOcrConfidence"] == box["confidence"]

    res = client.get(doc["contentUrl"])
    assert res.status_code == 200 and res.content == _png(img)


@needs_tesseract
def test_query_returns_image_citation(client, upload, fake_vision):
    img, _ = _slide("Grace Hopper built the first compiler.")
    doc = upload("hopper.png", _png(img))
    body = client.post(f"{API}/query", json={"query": "Grace Hopper compiler", "modality": "image"}).json()
    top = body["citations"][0]
    assert top["docId"] == doc["id"]
    assert top["modality"] == "image"
    assert top["boundingBoxLabel"].startswith("OCR ocr-1")


def test_caption_facts_are_whole_image_evidence(client, upload, fake_vision, monkeypatch):
    monkeypatch.setattr(image, "ocr", lambda img: [])
    monkeypatch.setattr(image, "caption", lambda img: "Isaac Newton observed the apple.")
    doc = upload("newton.png", _png(Image.new("RGB", (300, 200), "white")))
    assert doc["status"] == "completed"
    assert doc["boundingBoxes"] == []

    triplet = next(t for t in client.get(f"{API}/triplets").json() if t["sourceDocId"] == doc["id"])
    assert triplet["evidenceSource"] == "caption"
    assert "boundingBox" not in triplet
    ev = next(e for e in client.get(f"{API}/evidence").json() if e["tripletId"] == triplet["id"])
    assert ev["asrOcrConfidence"] is None  # captions have no recognition confidence
    assert "boundingBox" not in ev


def test_missing_tesseract_fails_with_install_help(upload, fake_vision, monkeypatch):
    monkeypatch.setattr(image.config, "TESSERACT_CMD", "")
    monkeypatch.setattr(image.shutil, "which", lambda name: None)
    monkeypatch.setattr(image, "DEFAULT_WINDOWS_TESSERACT", Path("Z:/missing/tesseract.exe"))
    doc = upload("no_ocr.png", _png(Image.new("RGB", (100, 100), "white")))
    assert doc["status"] == "failed"
    assert "winget install UB-Mannheim.TesseractOCR" in doc["summary"]
    assert "KD_TESSERACT_CMD" in doc["summary"]
