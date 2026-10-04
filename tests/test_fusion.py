"""
Unit and integration tests for Multimodal Late Fusion Engine and Entity Reconciliation.
"""

from pathlib import Path
import numpy as np
import pytest
from fastapi.testclient import TestClient

from fusion.embeddings import get_entity_embedding, normalize_embedding
from fusion.reconcile import reconcile_entities, compute_cosine_similarity
from fusion.pipeline import fuse
from backend.app.main import app

client = TestClient(app)

SAMPLE_IMAGE = Path("sample_data/sample_image.png").resolve()
SAMPLE_AUDIO = Path("sample_data/sample_audio.wav").resolve()


def test_normalize_embedding():
    vec = np.array([3.0, 4.0], dtype=np.float32)
    normed = normalize_embedding(vec)
    assert np.isclose(np.linalg.norm(normed), 1.0, atol=1e-4)
    assert np.allclose(normed, np.array([0.6, 0.8], dtype=np.float32), atol=1e-4)


def test_get_entity_embedding_cosine_similarity():
    e_tech1 = {"canonical_name": "Microsoft Corporation", "source": "image_text"}
    e_tech2 = {"canonical_name": "Microsoft", "source": "speech"}
    e_unrelated = {"canonical_name": "Pineapple Juice", "source": "vision"}

    emb1 = get_entity_embedding(e_tech1)
    emb2 = get_entity_embedding(e_tech2)
    emb3 = get_entity_embedding(e_unrelated)

    sim_related = compute_cosine_similarity(emb1, emb2)
    sim_unrelated = compute_cosine_similarity(emb1, emb3)

    assert sim_related > 0.70
    assert sim_related > sim_unrelated


def test_reconcile_entities_same_name_two_modalities():
    """
    CRITICAL TEST CASE:
    Deliberately constructed sample where the SAME entity appears in both on-screen text ('image_text')
    and spoken audio ('speech').
    Asserts that reconcile_entities() merges them into ONE entity with sources containing both 'image_text'
    and 'speech', and that confidence strictly increases due to multimodal corroboration.
    """
    entity_image_text = {
        "canonical_name": "Dr. Sharma",
        "text": "Dr. Sharma",
        "label": "PERSON",
        "source": "image_text",
        "bbox": [100, 50, 250, 90],
        "confidence": 0.85,
    }

    entity_speech = {
        "canonical_name": "Sharma",
        "text": "Sharma",
        "label": "PERSON",
        "source": "speech",
        "start_time": 1.2,
        "end_time": 3.4,
        "speaker": "SPEAKER_00",
        "confidence": 0.80,
    }

    entity_other = {
        "canonical_name": "Quantum Computer",
        "text": "Quantum Computer",
        "label": "PRODUCT",
        "source": "image_text",
        "bbox": [300, 150, 450, 200],
        "confidence": 0.75,
    }

    combined_input = [entity_image_text, entity_speech, entity_other]

    reconciled = reconcile_entities(combined_input)

    # Must produce 2 unique reconciled entities (Dr. Sharma + Quantum Computer), NOT 3
    assert len(reconciled) == 2

    # Find the reconciled Dr. Sharma entity
    sharma_reconciled = next(
        (r for r in reconciled if "sharma" in r["canonical_name"].lower()), None
    )
    assert sharma_reconciled is not None

    # Concrete assertions on multimodal late fusion:
    # 1. Sources must contain BOTH 'image_text' and 'speech'
    assert "image_text" in sharma_reconciled["sources"]
    assert "speech" in sharma_reconciled["sources"]
    assert len(sharma_reconciled["sources"]) == 2

    # 2. Canonical name selected appropriately
    assert "Sharma" in sharma_reconciled["canonical_name"]

    # 3. Evidence list contains both original observations
    assert len(sharma_reconciled["evidence"]) == 2

    # 4. Confidence strictly increases when supported by multiple modalities
    base_max_conf = max(entity_image_text["confidence"], entity_speech["confidence"])
    assert sharma_reconciled["confidence"] > base_max_conf


def test_fuse_end_to_end_pipeline():
    assert SAMPLE_IMAGE.exists()
    assert SAMPLE_AUDIO.exists()

    reconciled_results = fuse(
        image_path=str(SAMPLE_IMAGE),
        audio_path=str(SAMPLE_AUDIO),
        whisper_model="tiny",
    )

    assert isinstance(reconciled_results, list)
    for ent in reconciled_results:
        assert "canonical_name" in ent
        assert "sources" in ent
        assert isinstance(ent["sources"], list)
        assert len(ent["sources"]) >= 1
        assert "confidence" in ent
        assert "evidence" in ent


def test_api_fuse_endpoint():
    assert SAMPLE_IMAGE.exists()
    assert SAMPLE_AUDIO.exists()

    with open(SAMPLE_IMAGE, "rb") as f_img, open(SAMPLE_AUDIO, "rb") as f_aud:
        response = client.post(
            "/fuse",
            files={
                "image": ("sample_image.png", f_img, "image/png"),
                "audio": ("sample_audio.wav", f_aud, "audio/wav"),
            },
            data={"whisper_model": "tiny"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["image_provided"] is True
    assert data["audio_provided"] is True
    assert "reconciled_entities" in data
    assert isinstance(data["reconciled_entities"], list)
