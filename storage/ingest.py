"""
Knowledge Graph Ingestion Orchestrator
Coordinates multimodal entity resolution, Neo4j graph storage, and FAISS vector indexing.
"""

from typing import Any, Dict, List, Optional
import numpy as np

from fusion.embeddings import get_entity_embedding
from .neo4j_client import Neo4jClient
from .vector_index import FaissIndex

# Global / cached storage handles
_NEO4J_CLIENT: Optional[Neo4jClient] = None
_VECTOR_INDEX: Optional[FaissIndex] = None


def get_neo4j_client() -> Neo4jClient:
    """Retrieve or initialize singleton Neo4jClient."""
    global _NEO4J_CLIENT
    if _NEO4J_CLIENT is None:
        _NEO4J_CLIENT = Neo4jClient()
    return _NEO4J_CLIENT


def get_vector_index() -> FaissIndex:
    """Retrieve or initialize singleton FaissIndex."""
    global _VECTOR_INDEX
    if _VECTOR_INDEX is None:
        _VECTOR_INDEX = FaissIndex()
    return _VECTOR_INDEX


def ingest(
    fused_entities: List[Dict[str, Any]],
    relations: Optional[List[Dict[str, Any]]] = None,
    neo4j_client: Optional[Neo4jClient] = None,
    vector_index: Optional[FaissIndex] = None,
) -> Dict[str, int]:
    """
    Ingest reconciled multimodal entities and relations into Neo4j and FAISS.

    Orchestrates:
    1. For each entity: run entity_resolution() first. If an existing entity is resolved,
       merge it into the existing canonical entity. Otherwise create a new entity node.
    2. Upsert entity into Neo4j and add embedding vector to FAISS.
    3. Match relation subjects & objects to resolved canonical entity names, then upsert relations into Neo4j.
    4. Return summary dictionary.

    Args:
        fused_entities: Output list from fusion/pipeline.py or fusion/reconcile.py.
        relations: Output list of relation triples from nlu/relations.py or extraction.
        neo4j_client: Optional Neo4jClient instance.
        vector_index: Optional FaissIndex instance.

    Returns:
        Summary dict:
        {"entities_created": int, "entities_merged": int, "relations_created": int}
    """
    client = neo4j_client or get_neo4j_client()
    index = vector_index or get_vector_index()
    relations = relations or []

    entities_created = 0
    entities_merged = 0
    relations_created = 0

    name_resolution_map: Dict[str, str] = {}

    # 1. Ingest Entities with Entity Resolution
    for ent in fused_entities:
        ent_copy = dict(ent)
        candidate_name = (
            ent_copy.get("canonical_name")
            or ent_copy.get("text")
            or ent_copy.get("label")
            or "Unknown"
        ).strip()

        # Run entity resolution against existing graph nodes
        resolved_canonical_name = client.entity_resolution(candidate_name)

        if resolved_canonical_name:
            # Reconciled / Merged with existing graph node
            entities_merged += 1
            ent_copy["canonical_name"] = resolved_canonical_name
            name_resolution_map[candidate_name] = resolved_canonical_name
        else:
            # New unique entity in graph
            entities_created += 1
            ent_copy["canonical_name"] = candidate_name
            name_resolution_map[candidate_name] = candidate_name

        # Upsert entity node in Neo4j
        node_id = client.upsert_entity(ent_copy)

        # Compute embedding and index in FAISS
        try:
            emb = get_entity_embedding(ent_copy)
            index.add(
                entity_id=node_id,
                embedding=emb,
                metadata={"canonical_name": ent_copy["canonical_name"]},
            )
        except Exception:
            pass

    # 2. Ingest Relations with Entity Mapping
    for rel in relations:
        raw_subj = (rel.get("subject") or "").strip()
        raw_obj = (rel.get("object") or "").strip()
        rel_type = (rel.get("relation") or "RELATED_TO").strip()
        conf = float(rel.get("confidence", 0.8))

        if not raw_subj or not raw_obj:
            continue

        # Map subject and object to canonical resolved entities
        subj = name_resolution_map.get(raw_subj)
        if not subj:
            subj = client.entity_resolution(raw_subj) or raw_subj
            name_resolution_map[raw_subj] = subj

        obj = name_resolution_map.get(raw_obj)
        if not obj:
            obj = client.entity_resolution(raw_obj) or raw_obj
            name_resolution_map[raw_obj] = obj

        client.upsert_relation(
            subject=subj,
            relation=rel_type,
            object=obj,
            confidence=conf,
        )
        relations_created += 1

    return {
        "entities_created": entities_created,
        "entities_merged": entities_merged,
        "relations_created": relations_created,
    }
