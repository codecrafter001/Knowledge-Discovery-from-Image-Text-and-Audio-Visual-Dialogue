"""Ingestion job runner.

Text and image documents run through their extractors. Audio/video still walks the stub
stages until its extractor lands (Phase 1c).
"""
import logging
import time
from pathlib import Path

from . import config, knowledge, store, vectors

log = logging.getLogger(__name__)

EXTENSION_MODALITY = {
    ".pdf": "text", ".docx": "text", ".txt": "text", ".md": "text", ".json": "text",
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".tif": "image", ".tiff": "image", ".webp": "image",
    ".wav": "audio", ".mp3": "audio", ".flac": "audio", ".m4a": "audio",
    ".mp4": "video", ".mkv": "video", ".mov": "video", ".webm": "video",
}

STUB_STAGES = [("preprocessing", 20), ("extracting", 45), ("embedding", 70), ("graph_linking", 90)]

TEXT_CONTENT_LIMIT = 20_000


def detect_modality(filename: str) -> str | None:
    return EXTENSION_MODALITY.get(Path(filename).suffix.lower())


def run_ingestion(doc_id: str, path: Path) -> None:
    try:
        modality = detect_modality(path.name)
        if modality == "text":
            _ingest_text(doc_id, path)
        elif modality == "image":
            _ingest_image(doc_id, path)
        else:
            _ingest_stub(doc_id)
    except Exception as exc:
        log.exception("Ingestion failed for %s (%s)", doc_id, path)
        store.update_document(doc_id, status="failed", summary=f"Ingestion failed: {exc}")


def _index(doc_id: str, modality: str, result: dict) -> None:
    store.update_document(doc_id, status="embedding", progress=70)
    passage_vectors = vectors.embed([vectors.normalize(p["text"]) for p in result["passages"]])

    store.update_document(doc_id, status="graph_linking", progress=90)
    knowledge.save_extraction(doc_id, modality, result)
    vectors.save(doc_id, passage_vectors)  # after the extraction: the index keys on vector files


def _knowledge_fields(result: dict) -> dict:
    triples = result["triples"]
    return {
        "summary": result["summary"],
        "textContent": result["fullText"][:TEXT_CONTENT_LIMIT],
        "entityCount": len({m["key"] for m in result["mentions"]}),
        "relationCount": len({t["predicate"] for t in triples}),
        "tripletCount": len(triples),
        "confidenceScore": round(sum(t["confidence"] for t in triples) / len(triples), 2) if triples else 0,
    }


def _ingest_text(doc_id: str, path: Path) -> None:
    from .extractors import text

    store.update_document(doc_id, status="extracting", progress=30)
    result = text.extract(path)
    _index(doc_id, "text", result)
    store.update_document(
        doc_id,
        status="completed",
        progress=100,
        **_knowledge_fields(result),
        metadata={
            "pageCount": result["pageCount"],
            "tokenCount": result["tokenCount"],
            "nlpModel": result["extractor"],
            "embeddingModel": config.EMBED_MODEL,
        },
    )


def _block_boxes(result: dict) -> list[dict]:
    """OCR blocks as frontend BoundingBoxes, linked to the first entity found in each block."""
    block_entity: dict[str, str] = {}
    for m in sorted(result["mentions"], key=lambda m: m["label"] == "NOUN_CHUNK"):  # named entities first
        if m.get("blockId"):
            block_entity.setdefault(m["blockId"], knowledge.entity_id(m["key"]))
    boxes = []
    for b in result["ocrBlocks"]:
        entity = block_entity.get(b["id"])
        boxes.append({
            "id": b["id"],
            "label": b["text"] if len(b["text"]) <= 40 else b["text"][:37] + "...",
            "confidence": b["confidence"],
            "color": knowledge.OCR_BOX_COLOR if entity else knowledge.OCR_BOX_COLOR_PLAIN,
            **b["boundingBox"],
            **({"entityId": entity} if entity else {}),
        })
    return boxes


def _ingest_image(doc_id: str, path: Path) -> None:
    from .extractors import image

    store.update_document(doc_id, status="preprocessing", progress=10)
    img = image.load_image(path)

    store.update_document(doc_id, status="extracting", progress=30)
    blocks = image.ocr(img)
    caption = image.caption(img)
    result = image.build_result(img, blocks, caption)

    image.save_clip_embedding(doc_id, image.clip_embedding(img))
    _index(doc_id, "image", result)
    store.update_document(
        doc_id,
        status="completed",
        progress=100,
        **_knowledge_fields(result),
        boundingBoxes=_block_boxes(result),
        metadata={
            "resolution": result["resolution"],
            "tokenCount": result["tokenCount"],
            "visionModel": f"Tesseract OCR + {config.CAPTION_MODEL} + {config.CLIP_MODEL}",
            "nlpModel": result["extractor"],
            "embeddingModel": config.EMBED_MODEL,
        },
    )


def _ingest_stub(doc_id: str) -> None:
    for status, progress in STUB_STAGES:
        store.update_document(doc_id, status=status, progress=progress)
        time.sleep(config.STUB_STAGE_DELAY)
    store.update_document(
        doc_id, status="completed", progress=100,
        summary="Stored. Extraction for this modality is not implemented yet.",
    )
