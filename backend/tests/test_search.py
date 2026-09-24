import pytest

API = "/api/v1"

CORPUS = {
    "photosynthesis.txt": b"Chloroplasts convert sunlight into chemical energy during photosynthesis.\n\n"
                          b"Plants release oxygen as a byproduct.",
    "volcano.txt": b"Mount Etna erupted in 2021.\n\nLava flows threatened nearby villages in Sicily.",
    "physics.txt": b"Marie Curie discovered polonium in 1898.\n\nRadioactivity was studied in Paris laboratories.",
}


@pytest.fixture(scope="module")
def corpus(client):
    ids = {}
    for name, content in CORPUS.items():
        res = client.post(f"{API}/documents/upload", files={"file": (name, content)})
        ids[name] = res.json()["id"]
    return ids


def _query(client, query, mode="hybrid_cross_modal", modality="all"):
    res = client.post(f"{API}/query", json={"query": query, "mode": mode, "modality": modality})
    assert res.status_code == 200
    return res.json()


@pytest.mark.parametrize("mode", ["hybrid_cross_modal", "vector_semantic", "bm25"])
def test_top_citation_comes_from_relevant_document(client, corpus, mode):
    body = _query(client, "How do plants turn sunlight into energy?", mode)
    top = body["citations"][0]
    assert top["docId"] == corpus["photosynthesis.txt"]
    assert "sunlight" in top["snippet"]
    assert body["answer"].startswith(top["snippet"])


def test_semantic_search_matches_without_shared_keywords(client, corpus):
    body = _query(client, "volcanic eruption in Italy", "vector_semantic")
    assert body["citations"][0]["docId"] == corpus["volcano.txt"]


def test_graph_mode_follows_entity_triples(client, corpus):
    body = _query(client, "What did Marie Curie find?", "knowledge_graph")
    assert body["citations"][0]["snippet"] == "Marie Curie discovered polonium in 1898."
    assert body["subgraphNodes"]
    assert body["reasoningChain"][0]["type"] == "Knowledge Graph Traversal"


def test_hybrid_reports_every_step(client, corpus):
    body = _query(client, "Marie Curie polonium")
    types = [s["type"] for s in body["reasoningChain"]]
    assert types == ["Retrieval", "Retrieval", "Knowledge Graph Traversal", "Cross-Modal Fusion"]
    assert [s["step"] for s in body["reasoningChain"]] == [1, 2, 3, 4]
    for c in body["citations"]:
        assert 0 <= c["confidence"] <= 1 and 0 <= c["groundingScore"] <= 1


def test_irrelevant_query_returns_no_citations_in_vector_mode(client, corpus):
    body = _query(client, "zxqv blorf", "vector_semantic")
    assert body["citations"] == []
    assert body["confidence"] == 0


def test_modality_filter_excludes_other_modalities(client, corpus):
    body = _query(client, "photosynthesis", modality="image")
    assert body["citations"] == []
