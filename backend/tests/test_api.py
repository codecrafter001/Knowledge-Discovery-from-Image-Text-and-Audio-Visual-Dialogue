API = "/api/v1"


def test_health(client):
    res = client.get(f"{API}/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_read_endpoints_return_seed_data(client):
    for path in ["/documents", "/entities", "/relations", "/triplets", "/evidence",
                 "/pipeline/stages", "/pipeline/logs"]:
        res = client.get(API + path)
        assert res.status_code == 200, path
        assert len(res.json()) > 0, path
    assert set(client.get(f"{API}/graph").json()) == {"nodes", "links"}
    assert set(client.get(f"{API}/evaluation").json()) == {"cards", "benchmarks"}


def test_query_echoes_request(client):
    res = client.post(f"{API}/query", json={"query": "What is X?", "mode": "bm25"})
    body = res.json()
    assert body["query"] == "What is X?"
    assert body["retrievalMode"] == "bm25"
    assert isinstance(body["citations"], list)


def test_upload_runs_pipeline_to_completion(client):
    res = client.post(
        f"{API}/documents/upload",
        files={"file": ("lecture_notes.txt", b"Whisper transcribes audio.", "text/plain")},
        data={"domain": "Test"},
    )
    assert res.status_code == 202
    doc = res.json()
    assert doc["modality"] == "text"
    assert doc["title"] == "lecture notes"

    # TestClient runs background tasks before returning.
    stored = client.get(f"{API}/documents/{doc['id']}").json()
    assert stored["status"] == "completed"
    assert stored["progress"] == 100
    assert client.get(f"{API}/documents").json()[0]["id"] == doc["id"]


def test_upload_rejects_unknown_type(client):
    res = client.post(f"{API}/documents/upload", files={"file": ("x.exe", b"MZ", "application/octet-stream")})
    assert res.status_code == 415


def test_missing_document_404(client):
    assert client.get(f"{API}/documents/nope").status_code == 404
