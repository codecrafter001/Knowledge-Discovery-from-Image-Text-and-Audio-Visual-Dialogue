"""Text extractor: PDF / DOCX / TXT / MD / JSON -> entity mentions, triples and passages.

Every mention and triple carries its evidence: page number and character span into
the document's full text (pages joined with a blank line). Analysis is in nlp.py.
"""
import json
import re
from pathlib import Path

from .. import config
from .nlp import Segment, analyze

PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")


def _pages(path: Path) -> list[tuple[str, int | None]]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        import pymupdf

        with pymupdf.open(path) as pdf:
            return [(page.get_text(), i + 1) for i, page in enumerate(pdf)]
    if suffix == ".docx":
        import docx

        return [("\n\n".join(p.text for p in docx.Document(str(path)).paragraphs), None)]
    raw = path.read_text(encoding="utf-8", errors="replace")
    if suffix == ".json":
        try:
            raw = "\n\n".join(_json_strings(json.loads(raw)))
        except json.JSONDecodeError:
            pass
    return [(raw, None)]


def _json_strings(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        value = list(value.values())
    if isinstance(value, list):
        return [s for v in value for s in _json_strings(v)]
    return []


def load_segments(path: Path) -> tuple[str, list[Segment], int]:
    """Return (full_text, paragraph segments, page_count)."""
    pages = _pages(path)
    segments: list[Segment] = []
    parts: list[str] = []
    offset = 0
    for text, page in pages:
        pos = 0
        for para in PARAGRAPH_SPLIT.split(text):
            start = text.index(para, pos)
            pos = start + len(para)
            if para.strip():
                segments.append(Segment(para, page, offset + start))
        parts.append(text)
        offset += len(text) + 2
    return "\n\n".join(parts), segments, len(pages)


def extract(path: Path) -> dict:
    full_text, segments, page_count = load_segments(path)
    result = analyze(segments)
    return {
        "extractor": f"text/spacy:{config.SPACY_MODEL}",
        "fullText": full_text,
        "summary": " ".join(p["text"] for p in result["passages"][:3])[:400],
        "pageCount": page_count,
        **result,
    }
