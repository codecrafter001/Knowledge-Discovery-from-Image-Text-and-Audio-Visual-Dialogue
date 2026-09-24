"""Cross-modal query engine over indexed passages and the knowledge graph.

Retrieval signals:
  vector_semantic  - FAISS cosine similarity between query and passage embeddings
  bm25             - keyword ranking
  knowledge_graph  - entities named in the query -> triples touching them -> their evidence sentences
  hybrid           - reciprocal rank fusion (RRF) of all three

Answers are extractive: the top supporting passages, each returned as a citation.
"""
import re
import time

import numpy as np

from . import config, knowledge, store, vectors

RRF_K = 60
CANDIDATES = 50


def _entity_matches(query: str, entities: list[dict]) -> list[dict]:
    q = query.lower()
    matched = []
    for e in entities:
        names = {e["name"].lower(), e["attributes"].get("normalizedKey", ""), *(a.lower() for a in e["aliases"])}
        if any(len(n) > 1 and re.search(rf"(?<!\w){re.escape(n)}(?!\w)", q) for n in names if n):
            matched.append(e)
    return matched


def _rrf(*rankings: list[int]) -> list[int]:
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, idx in enumerate(ranking):
            scores[idx] = scores.get(idx, 0.0) + 1.0 / (RRF_K + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)


def _coverage(query_terms: set[str], text: str) -> float:
    if not query_terms:
        return 0.0
    return round(len(query_terms & set(vectors.tokenize(text))) / len(query_terms), 2)


def _empty(query: str, mode: str, start: float, message: str) -> dict:
    return {
        "query": query,
        "answer": message,
        "confidence": 0.0,
        "retrievalMode": mode,
        "executionTimeMs": round((time.perf_counter() - start) * 1000),
        "reasoningChain": [],
        "citations": [],
        "subgraphNodes": [],
    }


def search(query: str, mode: str = "hybrid_cross_modal", modality: str = "all") -> dict:
    start = time.perf_counter()
    index = vectors.get_index()
    if not len(index):
        return _empty(query, mode, start, "No documents are indexed yet. Upload documents to search them.")

    allowed = [i for i, p in enumerate(index.passages) if modality == "all" or p["modality"] == modality]
    if not allowed:
        return _empty(query, mode, start, f"No indexed {modality} documents to search.")
    allowed_set = set(allowed)

    query_vec = vectors.embed([query])
    all_sims = np.zeros(len(index), dtype=np.float32)
    sims, ids = index.faiss_index.search(query_vec, len(index))  # exact search over the whole corpus
    all_sims[ids[0]] = sims[0]

    steps: list[dict] = []
    rankings: list[list[int]] = []
    subgraph: list[str] = []

    vector_rank = [int(i) for i in ids[0] if i in allowed_set and all_sims[i] >= config.MIN_SIMILARITY][:CANDIDATES]
    if mode in ("vector_semantic", "hybrid_cross_modal"):
        rankings.append(vector_rank)
        steps.append({
            "type": "Retrieval",
            "description": f"Semantic search ({config.EMBED_MODEL.split('/')[-1]}) over {len(allowed)} passages: "
                           f"{len(vector_rank)} above cosine {config.MIN_SIMILARITY}.",
            "evidenceCited": f"Top similarity {max((all_sims[i] for i in vector_rank), default=0):.2f}",
            "confidence": round(float(max((all_sims[i] for i in vector_rank), default=0)), 2),
        })

    query_terms = set(vectors.tokenize(query))
    if mode in ("bm25", "hybrid_cross_modal"):
        bm25_scores = index.bm25.get_scores(list(query_terms)) if query_terms else np.zeros(len(index))
        bm25_rank = [i for i in np.argsort(-bm25_scores) if i in allowed_set and bm25_scores[i] > 0][:CANDIDATES]
        rankings.append([int(i) for i in bm25_rank])
        steps.append({
            "type": "Retrieval",
            "description": f"BM25 keyword search for [{', '.join(sorted(query_terms))}]: {len(bm25_rank)} matching passages.",
            "evidenceCited": f"{len(bm25_rank)} keyword hits",
            "confidence": 1.0 if bm25_rank else 0.0,
        })

    if mode in ("knowledge_graph", "hybrid_cross_modal"):
        entities, triplets = knowledge.build()
        matched = _entity_matches(query, entities)
        matched_ids = {e["id"] for e in matched}
        hops = sorted(
            (t for t in triplets if t["subjectId"] in matched_ids or t["objectId"] in matched_ids),
            key=lambda t: t["confidence"], reverse=True,
        )
        by_span = {(p["docId"], tuple(p["charSpan"])): i for i, p in enumerate(index.passages)}
        graph_rank: list[int] = []
        for t in hops:
            idx = by_span.get((t["sourceDocId"], tuple(t["charSpan"])))
            if idx is not None and idx in allowed_set and idx not in graph_rank:
                graph_rank.append(idx)
        rankings.append(graph_rank)
        subgraph = list(dict.fromkeys(
            [e["id"] for e in matched] + [x for t in hops for x in (t["subjectId"], t["objectId"])]
        ))
        paths = "; ".join(f"({t['subjectName']}) -[{t['predicate']}]-> ({t['objectName']})" for t in hops[:3])
        steps.append({
            "type": "Knowledge Graph Traversal",
            "description": f"Matched {len(matched)} entities in the query "
                           f"({', '.join(e['name'] for e in matched[:5]) or 'none'}); "
                           f"traversed {len(hops)} connected triples.",
            "evidenceCited": paths or "No graph paths",
            "confidence": round(max((t["confidence"] for t in hops), default=0.0), 2),
        })

    if mode == "hybrid_cross_modal":
        ranked = _rrf(*rankings)
        steps.append({
            "type": "Cross-Modal Fusion",
            "description": f"Fused semantic, keyword and graph rankings with reciprocal rank fusion (k={RRF_K}).",
            "evidenceCited": f"{len(ranked)} unique candidate passages",
            "confidence": 1.0 if ranked else 0.0,
        })
    else:
        ranked = rankings[0] if rankings else []

    top = ranked[: config.SEARCH_TOP_K]
    for n, step in enumerate(steps, 1):
        step["step"] = n
    if not top:
        resp = _empty(query, mode, start, "No supporting evidence found in the indexed documents.")
        resp["reasoningChain"], resp["subgraphNodes"] = steps, subgraph
        return resp

    titles = {d["id"]: d["title"] for d in store.list_documents()}
    citations = []
    for rank, idx in enumerate(top, 1):
        p = index.passages[idx]
        citations.append({
            "id": f"cit-{rank}",
            "docId": p["docId"],
            "docTitle": titles.get(p["docId"], p["docId"]),
            "modality": p["modality"],
            "confidence": round(float(max(all_sims[idx], 0.0)), 2),
            "snippet": vectors.normalize(p["text"]),
            "pageNumber": p["page"],
            "groundingScore": _coverage(query_terms, p["text"]),
        })

    return {
        "query": query,
        "answer": " ".join(c["snippet"] for c in citations[:2]),
        "confidence": citations[0]["confidence"],
        "retrievalMode": mode,
        "executionTimeMs": round((time.perf_counter() - start) * 1000),
        "reasoningChain": steps,
        "citations": citations,
        "subgraphNodes": subgraph,
    }
