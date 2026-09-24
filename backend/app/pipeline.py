"""Ingestion job runner.

Text documents run through the real text extractor. Image and audio/video still walk
the stub stages until their extractors land (Phase 1, image and AV pipelines).
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
        if detect_modality(path.name) == "text":
            _ingest_text(doc_id, path)
        else:
            _ingest_stub(doc_id)
    except Exception as exc:
        log.exception("Ingestion failed for %s (%s)", doc_id, path)
        store.update_document(doc_id, status="failed", summary=f"Ingestion failed: {exc}")


def _ingest_text(doc_id: str, path: Path) -> None:
    from .extractors import text

    store.update_document(doc_id, status="extracting", progress=30)
    result = text.extract(path)

    store.update_document(doc_id, status="embedding", progress=70)
    passage_vectors = vectors.embed([vectors.normalize(p["text"]) for p in result["passages"]])

    store.update_document(doc_id, status="graph_linking", progress=90)
    knowledge.save_extraction(doc_id, "text", result)
    vectors.save(doc_id, passage_vectors)  # after the extraction: the index keys on vector files

    triples = result["triples"]
    store.update_document(
        doc_id,
        status="completed",
        progress=100,
        summary=result["summary"],
        textContent=result["fullText"][:TEXT_CONTENT_LIMIT],
        entityCount=len({m["key"] for m in result["mentions"]}),
        relationCount=len({t["predicate"] for t in triples}),
        tripletCount=len(triples),
        confidenceScore=round(sum(t["confidence"] for t in triples) / len(triples), 2) if triples else 0,
        metadata={
            "pageCount": result["pageCount"],
            "tokenCount": result["tokenCount"],
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
