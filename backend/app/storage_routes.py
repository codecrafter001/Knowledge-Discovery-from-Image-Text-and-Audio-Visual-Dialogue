"""
FastAPI router for Knowledge Graph Storage and Ingestion endpoints.
Exposes POST /ingest and GET /graph/query.
"""

from pathlib import Path
import shutil
import tempfile
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from fusion.pipeline import fuse
from nlu.relations import extract_relations
from storage.ingest import ingest, get_neo4j_client, get_vector_index

router = APIRouter(tags=["storage"])

TEMP_INGEST_DIR = Path(tempfile.gettempdir()) / "kd_storage_uploads"
TEMP_INGEST_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/ingest")
async def ingest_endpoint(
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    whisper_model: str = Form("base"),
    yolo_conf_threshold: float = Form(0.25),
):
    """
    Multimodal Knowledge Graph ingestion endpoint.
    Accepts an image and/or audio file pair, runs multimodal late fusion,
    extracts relations, resolves entities against Neo4j, and indexes into FAISS.
    """
    if not image and not audio:
        raise HTTPException(
            status_code=400, detail="At least one modality ('image' or 'audio') must be provided."
        )

    saved_image_path = None
    saved_audio_path = None

    try:
        if image and image.filename:
            saved_image_path = TEMP_INGEST_DIR / image.filename
            with open(saved_image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)

        if audio and audio.filename:
            saved_audio_path = TEMP_INGEST_DIR / audio.filename
            with open(saved_audio_path, "wb") as buffer:
                shutil.copyfileobj(audio.file, buffer)

        # 1. Run Multimodal Late Fusion
        fused_entities = fuse(
            image_path=str(saved_image_path) if saved_image_path else None,
            audio_path=str(saved_audio_path) if saved_audio_path else None,
            whisper_model=whisper_model,
            yolo_conf_threshold=yolo_conf_threshold,
        )

        # 2. Extract Relations from textual evidence / transcripts
        relations: List[Dict[str, Any]] = []
        texts_to_analyze: List[str] = []
        for ent in fused_entities:
            for ev in ent.get("evidence", []):
                t = ev.get("text")
                if t and isinstance(t, str) and len(t.split()) >= 2 and t not in texts_to_analyze:
                    texts_to_analyze.append(t)

        for text_span in texts_to_analyze:
            try:
                rels = extract_relations(text_span)
                relations.extend(rels)
            except Exception:
                pass

        # 3. Ingest into Neo4j and FAISS
        summary = ingest(fused_entities=fused_entities, relations=relations)

        return {
            "status": "ok",
            "image_provided": bool(saved_image_path),
            "audio_provided": bool(saved_audio_path),
            "summary": summary,
            "entities_created": summary["entities_created"],
            "entities_merged": summary["entities_merged"],
            "relations_created": summary["relations_created"],
            "reconciled_entities": fused_entities,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Knowledge Graph Ingestion failed: {str(e)}")


@router.get("/graph/query")
def graph_query_endpoint(
    cypher: str = Query(..., description="Raw Cypher query to execute against Neo4j"),
):
    """
    Execute raw Cypher query against Neo4j for developer testing and verification.
    """
    if not cypher or not cypher.strip():
        raise HTTPException(status_code=400, detail="Query string 'cypher' cannot be empty.")

    client = get_neo4j_client()
    try:
        results = client.run_query(cypher)
        if results and isinstance(results, list) and "error" in results[0]:
            return {
                "status": "error",
                "cypher": cypher,
                "error": results[0]["error"],
                "results": [],
            }
        return {
            "status": "ok",
            "cypher": cypher,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cypher execution failed: {str(e)}")
