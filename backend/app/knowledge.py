"""Builds the frontend's knowledge views (entities, triplets, evidence, relations, graph)
from per-document extraction files, merged with the seed dataset when enabled.

Entities from different documents merge on their normalized key, so the same entity
extracted from two documents becomes one node with both sources.
"""
import hashlib
import json
from collections import Counter, defaultdict

from . import config, store

CATEGORY_COLORS = {
    "Concept": "#00f2fe",
    "Person": "#ec4899",
    "Organization": "#f59e0b",
    "Technology": "#10b981",
    "Location": "#38bdf8",
    "Metric": "#a855f7",
    "Visual Object": "#e100ff",
    "Audio Event": "#7f00ff",
}
MODALITY_LINK_COLORS = {"image": "#f59e0b", "audio": "#7f00ff", "video": "#00f2fe"}
OCR_BOX_COLOR = "#f59e0b"  # OCR block that contains an entity
OCR_BOX_COLOR_PLAIN = "#94a3b8"


def entity_id(key: str) -> str:
    """Stable id from the normalized key, so the same entity gets one id across documents."""
    return "ent-" + hashlib.sha1(key.encode()).hexdigest()[:10]


def save_extraction(doc_id: str, modality: str, result: dict) -> None:
    config.EXTRACTIONS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"docId": doc_id, "modality": modality, **result}
    (config.EXTRACTIONS_DIR / f"{doc_id}.json").write_text(json.dumps(payload), encoding="utf-8")


def _extractions() -> list[dict]:
    if not config.EXTRACTIONS_DIR.exists():
        return []
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(config.EXTRACTIONS_DIR.glob("*.json"))]


def _seed(key: str):
    return store.seed(key) if config.INCLUDE_SEED else ([] if key != "graph" else {"nodes": [], "links": []})


def _extracted_entities(extractions: list[dict]) -> dict[str, dict]:
    names: dict[str, Counter] = defaultdict(Counter)
    categories: dict[str, Counter] = defaultdict(Counter)
    confidences: dict[str, list[float]] = defaultdict(list)
    docs: dict[str, list[str]] = defaultdict(list)
    modalities: dict[str, list[str]] = defaultdict(list)

    for ex in extractions:
        for m in ex["mentions"]:
            key = m["key"]
            names[key][m["name"]] += 1
            categories[key][m["category"]] += 1
            confidences[key].append(m["confidence"])
            if ex["docId"] not in docs[key]:
                docs[key].append(ex["docId"])
            if ex["modality"] not in modalities[key]:
                modalities[key].append(ex["modality"])

    entities = {}
    for key, forms in names.items():
        name = forms.most_common(1)[0][0]
        category = categories[key].most_common(1)[0][0]
        n_docs = len(docs[key])
        entities[key] = {
            "id": entity_id(key),
            "name": name,
            "category": category,
            "description": f"Extracted from {n_docs} document{'s' if n_docs != 1 else ''}.",
            "modalityOrigins": modalities[key],
            "frequency": sum(forms.values()),
            "confidence": round(sum(confidences[key]) / len(confidences[key]), 2),
            "sourceDocIds": docs[key],
            "aliases": [f for f in forms if f != name],
            "attributes": {"normalizedKey": key},
            "color": CATEGORY_COLORS.get(category, "#00f2fe"),
        }
    return entities


def _extracted_triplets(extractions: list[dict], entities: dict[str, dict]) -> list[dict]:
    titles = {d["id"]: d["title"] for d in store.list_documents()}
    triplets = []
    for ex in extractions:
        for i, t in enumerate(ex["triples"]):
            subj, obj = entities[t["subjectKey"]], entities[t["objectKey"]]
            triplets.append({
                "id": f"tri-{ex['docId']}-{i}",
                "subjectId": subj["id"],
                "subjectName": subj["name"],
                "subjectCategory": subj["category"],
                "predicate": t["predicate"],
                "objectId": obj["id"],
                "objectName": obj["name"],
                "objectCategory": obj["category"],
                "modality": ex["modality"],
                "confidence": t["confidence"],
                "sourceDocId": ex["docId"],
                "sourceDocTitle": titles.get(ex["docId"], ex["docId"]),
                "evidenceSnippet": t["sentence"],
                "pageNumber": t["page"],
                "charSpan": t["charSpan"],
                "evidenceSource": t.get("source", "text"),  # text | ocr | caption
                **({"boundingBox": _ocr_box(t)} if "boundingBox" in t else {}),
                "verified": False,
            })
    return triplets


def _ocr_box(t: dict) -> dict:
    label = t["sentence"] if len(t["sentence"]) <= 40 else t["sentence"][:37] + "..."
    return {"id": t["blockId"], "label": label, "confidence": t["ocrConfidence"], "color": OCR_BOX_COLOR,
            **t["boundingBox"]}


def _evidence_confidence(t: dict) -> float | None:
    """OCR confidence for OCR evidence; 1.0 for native text (no OCR/ASR step); None for
    model-generated captions, which have no recognition confidence."""
    if t["evidenceSource"] == "ocr":
        return t["boundingBox"]["confidence"]
    return None if t["evidenceSource"] == "caption" else 1.0


def build() -> tuple[list[dict], list[dict]]:
    extractions = _extractions()
    entities = _extracted_entities(extractions)
    return list(entities.values()), _extracted_triplets(extractions, entities)


def entities() -> list[dict]:
    return build()[0] + _seed("entities")


def triplets() -> list[dict]:
    return build()[1] + _seed("triplets")


def relations() -> list[dict]:
    counts = Counter(t["predicate"] for t in build()[1])
    extracted = [
        {
            "id": f"rel-{pred}",
            "name": pred,
            "category": "Semantic",
            "description": "Verb relation extracted from text by dependency parsing.",
            "count": n,
        }
        for pred, n in counts.most_common()
    ]
    return extracted + _seed("relations")


def evidence() -> list[dict]:
    content_urls = {d["id"]: d.get("contentUrl") for d in store.list_documents()}
    items = [
        {
            "id": f"ev-{t['id']}",
            "tripletId": t["id"],
            "tripletText": f"{t['subjectName']} —{t['predicate']}→ {t['objectName']}",
            "docId": t["sourceDocId"],
            "docTitle": t["sourceDocTitle"],
            "modality": t["modality"],
            "confidence": t["confidence"],
            "textSnippet": t["evidenceSnippet"],
            "pageNumber": t["pageNumber"],
            "charSpan": t["charSpan"],
            "evidenceSource": t["evidenceSource"],
            **({"imageUrl": content_urls.get(t["sourceDocId"])} if t["modality"] == "image" else {}),
            **({"boundingBox": t["boundingBox"]} if "boundingBox" in t else {}),
            "alignmentScore": t["confidence"],
            "asrOcrConfidence": _evidence_confidence(t),
            "crossModalConsistency": 0.0,  # computed in Phase 2 (alignment)
        }
        for t in build()[1]
    ]
    return items + _seed("evidence")


def graph() -> dict:
    ents, trips = build()
    linked = {t["subjectId"] for t in trips} | {t["objectId"] for t in trips}
    nodes = [
        {
            "id": e["id"],
            "name": e["name"],
            "category": e["category"],
            "modality": e["modalityOrigins"][0],
            "val": max(12, e["frequency"] * 1.5),
            "color": e["color"],
            "entity": e,
        }
        for e in ents
        if e["id"] in linked
    ]
    links = [
        {
            "id": t["id"],
            "source": t["subjectId"],
            "target": t["objectId"],
            "predicate": t["predicate"],
            "confidence": t["confidence"],
            "modality": t["modality"],
            "tripletId": t["id"],
            "color": MODALITY_LINK_COLORS.get(t["modality"], "#10b981"),
        }
        for t in trips
    ]
    seed = _seed("graph")
    return {"nodes": nodes + seed["nodes"], "links": links + seed["links"]}
