"""Phase 0 storage: read-only seed data plus uploaded documents persisted to a JSON file.

Replaced by Neo4j / MongoDB / FAISS in later phases; routes only talk to this module.
"""
import json
import threading
from typing import Any

from . import config

_lock = threading.Lock()
_seed: dict[str, Any] = json.loads(config.SEED_PATH.read_text(encoding="utf-8"))


def seed(key: str) -> Any:
    return _seed[key]


def _load_uploaded() -> list[dict]:
    if not config.DOCUMENTS_DB.exists():
        return []
    return json.loads(config.DOCUMENTS_DB.read_text(encoding="utf-8"))


def _save_uploaded(docs: list[dict]) -> None:
    config.DOCUMENTS_DB.parent.mkdir(parents=True, exist_ok=True)
    tmp = config.DOCUMENTS_DB.with_suffix(".tmp")
    tmp.write_text(json.dumps(docs, indent=2), encoding="utf-8")
    tmp.replace(config.DOCUMENTS_DB)


def list_documents() -> list[dict]:
    with _lock:
        return _load_uploaded() + (seed("documents") if config.INCLUDE_SEED else [])


def get_document(doc_id: str) -> dict | None:
    return next((d for d in list_documents() if d["id"] == doc_id), None)


def add_document(doc: dict) -> None:
    with _lock:
        docs = _load_uploaded()
        docs.insert(0, doc)
        _save_uploaded(docs)


def update_document(doc_id: str, **fields: Any) -> dict | None:
    with _lock:
        docs = _load_uploaded()
        for d in docs:
            if d["id"] == doc_id:
                d.update(fields)
                _save_uploaded(docs)
                return d
    return None
