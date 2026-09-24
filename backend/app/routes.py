import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from . import config, knowledge, pipeline, search, store
from .schemas import HealthResponse, Modality, QueryRequest

router = APIRouter()

CHUNK_SIZE = 1024 * 1024


@router.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "version": config.API_VERSION}


# Documents

@router.get("/documents")
def list_documents():
    return store.list_documents()


@router.get("/documents/{doc_id}")
def get_document(doc_id: str):
    doc = store.get_document(doc_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return doc


@router.post("/documents/upload", status_code=202)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    domain: str = Form("Cross-Modal Discovery"),
    modality: Modality | None = Form(None),
):
    filename = Path(file.filename or "upload").name
    detected = pipeline.detect_modality(filename)
    if detected is None:
        raise HTTPException(415, f"Unsupported file type: {Path(filename).suffix or filename}")

    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = config.UPLOAD_DIR / f"{doc_id}{Path(filename).suffix.lower()}"

    size = 0
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(CHUNK_SIZE):
                size += len(chunk)
                if size > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "File too large")
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise

    doc = {
        "id": doc_id,
        "title": title or Path(filename).stem.replace("_", " "),
        "filename": filename,
        "modality": modality or detected,
        "fileSize": f"{size / (1024 * 1024):.1f} MB",
        "uploadedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "queued",
        "progress": 0,
        "domain": domain,
        "summary": "",
        "confidenceScore": 0,
        "entityCount": 0,
        "relationCount": 0,
        "tripletCount": 0,
        "contentUrl": None,
        "metadata": {},
    }
    store.add_document(doc)
    background.add_task(pipeline.run_ingestion, doc_id, dest)
    return doc


# Knowledge

@router.get("/entities")
def entities():
    return knowledge.entities()


@router.get("/relations")
def relations():
    return knowledge.relations()


@router.get("/triplets")
def triplets():
    return knowledge.triplets()


@router.get("/graph")
def graph():
    return knowledge.graph()


@router.get("/evidence")
def evidence():
    return knowledge.evidence()


# Pipeline

@router.get("/pipeline/stages")
def pipeline_stages():
    return store.seed("pipeline_stages")


@router.get("/pipeline/logs")
def pipeline_logs():
    return store.seed("pipeline_logs")


# Query

@router.post("/query")
def query(req: QueryRequest):
    return search.search(req.query, req.mode, req.modality)


# Evaluation

@router.get("/evaluation")
def evaluation():
    return store.seed("evaluation")
