"""
Unit and integration tests for Knowledge Graph Storage layer.
Tests Neo4j Client, FAISS Vector Index, Entity Resolution, Ingestion Pipeline, and API Endpoints.
"""

from pathlib import Path
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from fusion.embeddings import get_entity_embedding
from storage.neo4j_client import Neo4jClient
from storage.vector_index import FaissIndex
from storage.ingest import ingest

client = TestClient(app)

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()
SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


@pytest.fixture
def clean_storage(tmp_path):
    """Fixture providing an isolated FaissIndex and Neo4jClient instance for testing."""
    index_path = tmp_path / "test_entities.faiss"
    meta_path = tmp_path / "test_entities_meta.json"
    vector_index = FaissIndex(dimension=384, index_path=index_path, meta_path=meta_path)
    neo4j_client = Neo4jClient()
    # Reset in-memory buffers if running in simulated mode
    neo4j_client._in_memory_nodes.clear()
    neo4j_client._in_memory_relations.clear()
    return neo4j_client, vector_index


def test_faiss_index_add_and_search(clean_storage):
    neo4j_client, vector_index = clean_storage

    vec1 = np.random.randn(384).astype(np.float32)
    vec2 = np.random.randn(384).astype(np.float32)

    vector_index.add("node_1", vec1, metadata={"name": "Entity One"})
    vector_index.add("node_2", vec2, metadata={"name": "Entity Two"})

    assert len(vector_index.id_map) == 2

    # Query with vec1 (exact match should score close to 1.0)
    results = vector_index.search(vec1, k=2)
    assert len(results) == 2
    assert results[0]["entity_id"] == "node_1"
    assert results[0]["score"] > 0.95


def test_neo4j_client_upsert_entity_and_relation(clean_storage):
    neo4j_client, _ = clean_storage

    entity = {
        "canonical_name": "Google",
        "sources": ["image_text", "speech"],
        "confidence": 0.95,
        "evidence": [{"text": "Google is leading AI research."}],
        "entity_type": "ORGANIZATION",
    }

    node_id = neo4j_client.upsert_entity(entity)
    assert node_id is not None
    assert isinstance(node_id, str)

    # Upsert related entity and relation
    entity2 = {
        "canonical_name": "DeepMind",
        "sources": ["speech"],
        "confidence": 0.90,
        "evidence": [{"text": "DeepMind acquired."}],
        "entity_type": "ORGANIZATION",
    }
    node_id2 = neo4j_client.upsert_entity(entity2)

    neo4j_client.upsert_relation(
        subject="Google",
        relation="ACQUIRED",
        object="DeepMind",
        confidence=0.92,
    )

    names = neo4j_client.get_all_entity_names()
    assert "Google" in names
    assert "DeepMind" in names


def test_entity_resolution_and_deduplication(clean_storage):
    """
    CRITICAL TEST CASE:
    Ingests the same entity twice under slightly different names:
    - 1st ingest: "Dr. A. Sharma" -> entities_created=1, entities_merged=0
    - 2nd ingest: "Anita Sharma" (or "Dr. Sharma") -> entities_created=0, entities_merged=1
    Asserts that the second ingest triggers entities_merged=1, not entities_created=1.
    """
    neo4j_client, vector_index = clean_storage

    # Pass 1: Ingest "Dr. A. Sharma"
    first_entities = [
        {
            "canonical_name": "Dr. A. Sharma",
            "sources": ["image_text"],
            "confidence": 0.85,
            "evidence": [{"text": "Dr. A. Sharma presented findings."}],
            "entity_type": "PERSON",
        }
    ]
    summary1 = ingest(
        fused_entities=first_entities,
        relations=[],
        neo4j_client=neo4j_client,
        vector_index=vector_index,
    )

    assert summary1["entities_created"] == 1
    assert summary1["entities_merged"] == 0

    # Pass 2: Ingest "Anita Sharma" / "Dr. Sharma"
    second_entities = [
        {
            "canonical_name": "Dr. Sharma",
            "sources": ["speech"],
            "confidence": 0.88,
            "evidence": [{"text": "Sharma spoke about quantum computing."}],
            "entity_type": "PERSON",
        }
    ]
    summary2 = ingest(
        fused_entities=second_entities,
        relations=[],
        neo4j_client=neo4j_client,
        vector_index=vector_index,
    )

    assert summary2["entities_created"] == 0
    assert summary2["entities_merged"] == 1


def test_ingest_with_relations(clean_storage):
    neo4j_client, vector_index = clean_storage

    fused_entities = [
        {
            "canonical_name": "Microsoft",
            "sources": ["image_text"],
            "confidence": 0.90,
            "evidence": [{"text": "Microsoft invests in OpenAI"}],
            "entity_type": "ORGANIZATION",
        },
        {
            "canonical_name": "OpenAI",
            "sources": ["speech"],
            "confidence": 0.92,
            "evidence": [{"text": "OpenAI releases models"}],
            "entity_type": "ORGANIZATION",
        },
    ]

    relations = [
        {
            "subject": "Microsoft",
            "relation": "INVESTED_IN",
            "object": "OpenAI",
            "confidence": 0.95,
        }
    ]

    summary = ingest(
        fused_entities=fused_entities,
        relations=relations,
        neo4j_client=neo4j_client,
        vector_index=vector_index,
    )

    assert summary["entities_created"] == 2
    assert summary["entities_merged"] == 0
    assert summary["relations_created"] == 1


def test_api_graph_query_endpoint():
    response = client.get("/graph/query", params={"cypher": "MATCH (e:Entity) RETURN e.canonical_name LIMIT 10"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "error"]
    assert "cypher" in data


def test_api_ingest_endpoint():
    assert SAMPLE_IMAGE.exists()
    assert SAMPLE_AUDIO.exists()

    with open(SAMPLE_IMAGE, "rb") as f_img, open(SAMPLE_AUDIO, "rb") as f_aud:
        response = client.post(
            "/ingest",
            files={
                "image": ("sample_image.png", f_img, "image/png"),
                "audio": ("sample_audio.wav", f_aud, "audio/wav"),
            },
            data={"whisper_model": "tiny"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "summary" in data
    assert "entities_created" in data
    assert "entities_merged" in data
    assert "relations_created" in data
    assert isinstance(data["reconciled_entities"], list)
