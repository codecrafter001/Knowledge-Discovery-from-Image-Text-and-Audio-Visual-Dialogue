import pymupdf

API = "/api/v1"


def _doc_triplets(client, doc_id):
    return [t for t in client.get(f"{API}/triplets").json() if t["sourceDocId"] == doc_id]


def test_text_upload_extracts_triplets_with_evidence(client, upload):
    doc = upload("whisper.txt", b"OpenAI released Whisper in 2022.\n\nThe model transcribes speech.")
    assert doc["status"] == "completed"
    assert doc["tripletCount"] >= 1
    assert doc["textContent"].startswith("OpenAI released Whisper")

    triplets = _doc_triplets(client, doc["id"])
    release = next(t for t in triplets if t["predicate"] == "release")
    assert (release["subjectName"], release["objectName"]) == ("OpenAI", "Whisper")

    # The evidence span must point at the supporting sentence in the source text.
    start, end = release["charSpan"]
    assert doc["textContent"][start:end] == release["evidenceSnippet"] == "OpenAI released Whisper in 2022."

    evidence = [e for e in client.get(f"{API}/evidence").json() if e["tripletId"] == release["id"]]
    assert evidence and evidence[0]["textSnippet"] == release["evidenceSnippet"]


def test_passive_voice_uses_agent_as_subject(client, upload):
    doc = upload("passive.txt", b"The Transformer was introduced by Google.")
    t = _doc_triplets(client, doc["id"])[0]
    assert (t["subjectName"], t["predicate"], t["objectName"]) == ("Google", "introduce", "Transformer")


def test_entities_merge_across_documents(client, upload):
    a = upload("a.txt", b"Microsoft acquired GitHub in 2018.")
    b = upload("b.txt", b"GitHub hosts open source code.")
    github = [e for e in client.get(f"{API}/entities").json() if e["name"] == "GitHub"]
    assert len(github) == 1
    assert {a["id"], b["id"]} <= set(github[0]["sourceDocIds"])

    graph = client.get(f"{API}/graph").json()
    assert github[0]["id"] in {n["id"] for n in graph["nodes"]}


def test_pdf_evidence_keeps_page_number(client, upload):
    pdf = pymupdf.open()
    pdf.new_page().insert_text((72, 72), "Introduction page.")
    pdf.new_page().insert_text((72, 72), "Amazon launched Alexa in 2014.")
    doc = upload("paper.pdf", pdf.tobytes())

    assert doc["metadata"]["pageCount"] == 2
    t = next(t for t in _doc_triplets(client, doc["id"]) if t["predicate"] == "launch")
    assert t["pageNumber"] == 2
    start, end = t["charSpan"]
    assert doc["textContent"][start:end] == t["evidenceSnippet"]


def test_relations_count_extracted_predicates(client, upload):
    upload("r.txt", b"Netflix streams movies.")
    rel = next(r for r in client.get(f"{API}/relations").json() if r["name"] == "stream")
    assert rel["count"] >= 1
