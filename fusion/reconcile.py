"""
Multimodal late fusion entity reconciliation module.
Reconciles and deduplicates entities across text, vision, and speech modalities.
"""

from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

from .embeddings import get_entity_embedding, normalize_embedding


def compute_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Compute cosine similarity between two normalized vectors."""
    if vec1.shape != vec2.shape:
        return 0.0
    dot = np.dot(vec1, vec2)
    return float(np.clip(dot, -1.0, 1.0))


def compute_bbox_iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    if not box1 or not box2 or len(box1) < 4 or len(box2) < 4:
        return 0.0
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])

    union_area = area1 + area2 - inter_area
    if union_area <= 1e-6:
        return 0.0
    return float(inter_area / union_area)


def are_entities_matching(
    e1: Dict[str, Any],
    e2: Dict[str, Any],
    emb1: np.ndarray,
    emb2: np.ndarray,
    sim_threshold: float = 0.75,
    temporal_threshold: float = 3.0,
) -> bool:
    """
    Determine if two entities represent the same semantic entity using:
    1. Direct name match / alias substring / lemmatization
    2. Embedding cosine similarity >= threshold
    3. Spatial overlap (IoU) or temporal proximity
    """
    name1 = (e1.get("canonical_name") or e1.get("text") or e1.get("label") or "").strip().lower()
    name2 = (e2.get("canonical_name") or e2.get("text") or e2.get("label") or "").strip().lower()

    if not name1 or not name2:
        return False

    # 1. Exact or strong substring string match
    if name1 == name2 or name1 in name2 or name2 in name1:
        return True

    # 2. Embedding similarity signal
    cos_sim = compute_cosine_similarity(emb1, emb2)
    if cos_sim >= sim_threshold:
        return True

    # 3. Spatial proximity signal (for OCR text vs detected visual object)
    bbox1 = e1.get("bbox")
    bbox2 = e2.get("bbox")
    if bbox1 and bbox2:
        iou = compute_bbox_iou(bbox1, bbox2)
        if iou > 0.15 and cos_sim >= 0.50:
            return True

    # 4. Temporal proximity signal (for video frame vs speech timestamp)
    t1 = e1.get("timestamp") or e1.get("start_time") or e1.get("start")
    t2 = e2.get("timestamp") or e2.get("start_time") or e2.get("start")
    if t1 is not None and t2 is not None:
        if abs(float(t1) - float(t2)) <= temporal_threshold and cos_sim >= 0.60:
            return True

    return False


def select_canonical_name(cluster_entities: List[Dict[str, Any]]) -> str:
    """Select the most descriptive and frequent canonical name from a cluster."""
    names = []
    for e in cluster_entities:
        n = (e.get("canonical_name") or e.get("text") or e.get("label") or "").strip()
        if n:
            names.append(n)

    if not names:
        return "Unknown_Entity"

    # Prefer named entity mentions over generic labels, and prefer longer names (e.g. 'Dr. Sharma' over 'Sharma')
    # Rank by length and title-case
    sorted_names = sorted(names, key=lambda x: (len(x.split()), len(x)), reverse=True)
    return sorted_names[0]


def reconcile_entities(
    entities: List[Dict[str, Any]],
    sim_threshold: float = 0.75,
    temporal_threshold: float = 3.0,
) -> List[Dict[str, Any]]:
    """
    Reconcile and deduplicate a combined list of multimodal entities.

    Args:
        entities: Combined entity list from image_text, vision, speech.
        sim_threshold: Embedding cosine similarity threshold for clustering.
        temporal_threshold: Maximum time difference in seconds for temporal alignment.

    Returns:
        List of reconciled entities:
        [
          {
            "canonical_name": str,
            "sources": ["image_text", "speech", ...],
            "confidence": float,
            "evidence": [original entity dicts],
            "entity_type": str,
            "bounding_boxes": list,
            "timestamps": list
          },
          ...
        ]
    """
    if not entities:
        return []

    # Precompute embeddings for all entities
    embeddings = [get_entity_embedding(e) for e in entities]

    n = len(entities)
    # Adjacency matrix for entity graph
    adj = [[False] * n for _ in range(n)]

    for i in range(n):
        adj[i][i] = True
        for j in range(i + 1, n):
            if are_entities_matching(
                entities[i],
                entities[j],
                embeddings[i],
                embeddings[j],
                sim_threshold=sim_threshold,
                temporal_threshold=temporal_threshold,
            ):
                adj[i][j] = True
                adj[j][i] = True

    # Connected component clustering
    visited = [False] * n
    reconciled_results: List[Dict[str, Any]] = []

    for i in range(n):
        if visited[i]:
            continue

        cluster_indices = []
        queue = [i]
        visited[i] = True

        while queue:
            curr = queue.pop(0)
            cluster_indices.append(curr)
            for neighbor in range(n):
                if adj[curr][neighbor] and not visited[neighbor]:
                    visited[neighbor] = True
                    queue.append(neighbor)

        cluster = [entities[idx] for idx in cluster_indices]

        # Aggregate modalities and attributes
        sources: Set[str] = set()
        confidences: List[float] = []
        bboxes: List[List[int]] = []
        timestamps: List[float] = []
        labels: List[str] = []

        for e in cluster:
            src = e.get("source")
            if src:
                sources.add(str(src))

            conf = float(e.get("confidence", 0.75))
            confidences.append(conf)

            bbox = e.get("bbox")
            if bbox and len(bbox) == 4:
                bboxes.append(bbox)

            t = e.get("timestamp") or e.get("start_time") or e.get("start")
            if t is not None:
                timestamps.append(float(t))

            lbl = e.get("label") or e.get("entity_type")
            if lbl:
                labels.append(str(lbl))

        unique_sources = sorted(list(sources))
        canonical_name = select_canonical_name(cluster)

        # Base confidence calculation: maximum confidence among observations
        base_confidence = max(confidences) if confidences else 0.75

        # RECONCILIATION BOOST:
        # Confidence strictly increases when supported by more than one distinct modality
        num_modalities = len(unique_sources)
        if num_modalities > 1:
            # Corroboration boost (+0.12 for each additional modality, capped at 0.99)
            reconciled_confidence = min(0.99, round(base_confidence + 0.12 * (num_modalities - 1), 4))
        else:
            reconciled_confidence = round(base_confidence, 4)

        # Predominant entity type/label
        entity_type = labels[0] if labels else "MISC"

        reconciled_results.append({
            "canonical_name": canonical_name,
            "sources": unique_sources,
            "confidence": reconciled_confidence,
            "entity_type": entity_type,
            "bounding_boxes": bboxes,
            "timestamps": timestamps,
            "evidence": cluster,
        })

    # Sort reconciled entities by confidence and number of sources descending
    reconciled_results.sort(key=lambda x: (len(x["sources"]), x["confidence"]), reverse=True)
    return reconciled_results
