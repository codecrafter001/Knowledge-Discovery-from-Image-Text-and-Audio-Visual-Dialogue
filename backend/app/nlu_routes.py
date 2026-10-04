"""
FastAPI router for Natural Language Understanding (NLU) endpoints.
Exposes POST /understand for coreference resolution, NER, relation extraction, and dialogue act analysis.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nlu.coreference import resolve_coreferences
from nlu.entities import extract_entities
from nlu.relations import extract_relations
from nlu.dialogue import analyze_dialogue

router = APIRouter(tags=["nlu"])


class UnderstandRequest(BaseModel):
    text: Optional[str] = Field(default=None, description="Raw text or concatenated transcript string")
    transcript: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Optional speaker-attributed transcript list from ASR"
    )


@router.post("/understand")
async def understand_endpoint(request: UnderstandRequest):
    """
    Consumes raw text (OCR text, document text, or ASR transcript):
    1. Resolves coreferences (pronouns replaced with antecedent entities).
    2. Extracts named entities with character offsets and labels.
    3. Extracts semantic relations (subject, relation, object) between entities.
    4. Analyzes dialogue acts if transcript utterances are provided.
    """
    try:
        raw_text = request.text or ""

        # If transcript is provided but text is empty, reconstruct raw_text from utterances
        if not raw_text and request.transcript:
            raw_text = " ".join(
                str(utt.get("text", "")).strip() for utt in request.transcript if utt.get("text")
            )

        if not raw_text and not request.transcript:
            raise HTTPException(status_code=400, detail="Either 'text' or 'transcript' must be provided.")

        # Step 1: Coreference Resolution
        resolved_text = resolve_coreferences(raw_text) if raw_text else ""

        # Step 2: Entity Extraction on resolved text
        entities = extract_entities(resolved_text) if resolved_text else []

        # Step 3: Relation Extraction on resolved text using entities
        relations = extract_relations(resolved_text, entities=entities) if resolved_text else []

        # Step 4: Dialogue Act Analysis (if transcript utterances provided)
        analyzed_transcript = None
        if request.transcript:
            analyzed_transcript = analyze_dialogue(request.transcript)

        return {
            "status": "ok",
            "original_text": raw_text,
            "resolved_text": resolved_text,
            "entities": entities,
            "entity_count": len(entities),
            "relations": relations,
            "relation_count": len(relations),
            "transcript": analyzed_transcript,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLU processing failed: {str(e)}")
