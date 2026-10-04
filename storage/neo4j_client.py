"""
Neo4j Graph Database Client
Manages knowledge graph connection, entity node upserts, relation upserts,
and entity resolution using string similarity (rapidfuzz) and dense embeddings.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Union
import numpy as np

try:
    from neo4j import GraphDatabase, Driver
except ImportError:
    GraphDatabase = None
    Driver = None

try:
    from rapidfuzz import fuzz
except ImportError:
    fuzz = None

from fusion.embeddings import get_entity_embedding, normalize_embedding
from fusion.reconcile import compute_cosine_similarity


class Neo4jClient:
    """Interface for Neo4j knowledge graph storage and querying."""

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self._driver: Optional[Any] = None
        
        # Local cache / fallback in-memory store for offline/testing scenarios
        self._in_memory_nodes: Dict[str, Dict[str, Any]] = {}
        self._in_memory_relations: List[Dict[str, Any]] = []

    def connect(self) -> bool:
        """Establish a connection to the Neo4j instance."""
        if GraphDatabase is None:
            return False
        if self._driver is not None:
            try:
                self._driver.verify_connectivity()
                return True
            except Exception:
                self._driver = None

        try:
            self._driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
            )
            self._driver.verify_connectivity()
            return True
        except Exception:
            self._driver = None
            return False

    def close(self) -> None:
        """Close driver connection."""
        if self._driver:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None

    def run_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Execute a Cypher query and return results."""
        if self.connect() and self._driver:
            try:
                with self._driver.session() as session:
                    result = session.run(query, parameters or {})
                    return [record.data() for record in result]
            except Exception as e:
                return [{"error": str(e)}]

        # In-memory query simulation for dev/testing when Neo4j daemon is offline
        return self._simulate_query(query, parameters or {})

    def _simulate_query(self, query: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Simulate basic Cypher query execution for local offline development & tests."""
        q_upper = query.strip().upper()
        if "MATCH (E:ENTITY) RETURN E.CANONICAL_NAME" in q_upper or "RETURN E.CANONICAL_NAME" in q_upper:
            return [{"canonical_name": k} for k in self._in_memory_nodes.keys()]
        if "MATCH (N:ENTITY)" in q_upper and "COUNT" in q_upper:
            return [{"count": len(self._in_memory_nodes)}]
        if "MATCH (N)" in q_upper and "RETURN N" in q_upper:
            return [{"n": dict(v)} for v in self._in_memory_nodes.values()]
        return []

    def get_all_entity_names(self) -> List[str]:
        """Fetch all existing canonical entity names in the graph."""
        if self.connect() and self._driver:
            query = "MATCH (e:Entity) RETURN e.canonical_name AS canonical_name"
            results = self.run_query(query)
            names = [r["canonical_name"] for r in results if "canonical_name" in r and r["canonical_name"]]
            return list(dict.fromkeys(names))
        return list(self._in_memory_nodes.keys())

    def upsert_entity(self, entity: Dict[str, Any]) -> str:
        """
        Creates or updates an :Entity node, keyed by canonical_name (using MERGE).
        Stores sources, confidence, and evidence (as JSON string property).
        Returns the Neo4j internal node id (or elementId).

        Args:
            entity: Reconciled entity dict with keys canonical_name, sources, confidence, evidence.

        Returns:
            Internal node id as string.
        """
        canonical_name = (
            entity.get("canonical_name")
            or entity.get("text")
            or entity.get("label")
            or "Unknown_Entity"
        ).strip()

        sources = entity.get("sources", [])
        if isinstance(sources, (set, tuple)):
            sources = list(sources)
        elif not isinstance(sources, list):
            sources = [str(sources)]

        confidence = float(entity.get("confidence", 0.75))
        
        evidence = entity.get("evidence", [])
        evidence_json = json.dumps(evidence) if not isinstance(evidence, str) else evidence
        entity_type = entity.get("entity_type", "ENTITY")

        if self.connect() and self._driver:
            cypher = """
            MERGE (e:Entity {canonical_name: $canonical_name})
            SET e.sources = $sources,
                e.confidence = $confidence,
                e.evidence = $evidence,
                e.entity_type = $entity_type,
                e.updated_at = timestamp()
            RETURN elementId(e) AS node_id, id(e) AS legacy_id
            """
            params = {
                "canonical_name": canonical_name,
                "sources": sources,
                "confidence": confidence,
                "evidence": evidence_json,
                "entity_type": entity_type,
            }
            results = self.run_query(cypher, params)
            if results and not results[0].get("error"):
                node_id = results[0].get("node_id") or results[0].get("legacy_id")
                return str(node_id)

        # In-memory storage fallback
        node_id = f"node_{len(self._in_memory_nodes) + 1}"
        if canonical_name in self._in_memory_nodes:
            node_id = self._in_memory_nodes[canonical_name]["id"]

        self._in_memory_nodes[canonical_name] = {
            "id": node_id,
            "canonical_name": canonical_name,
            "sources": sources,
            "confidence": confidence,
            "evidence": evidence_json,
            "entity_type": entity_type,
        }
        return str(node_id)

    def upsert_relation(
        self,
        subject: str,
        relation: str,
        object: str,
        confidence: float = 0.8,
    ) -> None:
        """
        MERGE a relationship of type based on `relation` between the two matching :Entity nodes.

        Args:
            subject: Canonical name of subject entity.
            relation: Predicate / relationship label.
            object: Canonical name of object entity.
            confidence: Confidence score of the relation.
        """
        if not subject or not object or not relation:
            return

        subject = subject.strip()
        object = object.strip()
        
        # Sanitize relation type for Cypher
        rel_type = re.sub(r"[^A-Za-z0-9_]", "_", relation.strip().upper()).strip("_")
        if not rel_type:
            rel_type = "RELATED_TO"

        if self.connect() and self._driver:
            cypher = f"""
            MERGE (s:Entity {{canonical_name: $subject}})
            MERGE (o:Entity {{canonical_name: $object}})
            MERGE (s)-[r:`{rel_type}`]->(o)
            SET r.confidence = $confidence,
                r.relation = $raw_relation,
                r.updated_at = timestamp()
            """
            params = {
                "subject": subject,
                "object": object,
                "confidence": float(confidence),
                "raw_relation": relation,
            }
            self.run_query(cypher, params)
            return

        # In-memory fallback
        # Ensure subject and object nodes exist
        if subject not in self._in_memory_nodes:
            self._in_memory_nodes[subject] = {
                "id": f"node_{len(self._in_memory_nodes) + 1}",
                "canonical_name": subject,
                "sources": ["inferred"],
                "confidence": 0.75,
                "evidence": "[]",
                "entity_type": "ENTITY",
            }
        if object not in self._in_memory_nodes:
            self._in_memory_nodes[object] = {
                "id": f"node_{len(self._in_memory_nodes) + 1}",
                "canonical_name": object,
                "sources": ["inferred"],
                "confidence": 0.75,
                "evidence": "[]",
                "entity_type": "ENTITY",
            }

        # Check if relation already exists
        for r in self._in_memory_relations:
            if r["subject"] == subject and r["relation"] == rel_type and r["object"] == object:
                r["confidence"] = float(confidence)
                return

        self._in_memory_relations.append({
            "subject": subject,
            "relation": rel_type,
            "raw_relation": relation,
            "object": object,
            "confidence": float(confidence),
        })

    def entity_resolution(
        self,
        name: str,
        sim_threshold: float = 0.75,
        string_sim_threshold: float = 80.0,
    ) -> Optional[str]:
        """
        Before creating a new node, check if an existing node has a canonical_name
        with high string similarity (use rapidfuzz) OR an embedding within the same
        similarity threshold used in fusion/reconcile.py (0.75).

        If found, return the existing canonical_name instead of creating a duplicate node.
        If not found, return None.

        Args:
            name: The candidate entity name to resolve.
            sim_threshold: Embedding cosine similarity threshold (default 0.75).
            string_sim_threshold: Rapidfuzz token/ratio similarity threshold (default 80.0).

        Returns:
            Existing canonical_name string if resolved, else None.
        """
        if not name or not str(name).strip():
            return None

        clean_name = str(name).strip()
        clean_name_lower = clean_name.lower()
        existing_names = self.get_all_entity_names()

        if not existing_names:
            return None

        # 1. Exact or case-insensitive match
        for existing in existing_names:
            if existing.strip().lower() == clean_name_lower:
                return existing

        # 2. String similarity & Substring checks using rapidfuzz / standard logic
        best_string_match = None
        highest_string_score = 0.0

        for existing in existing_names:
            ex_lower = existing.strip().lower()
            
            # Substring containment (e.g. "Dr. Sharma" and "Sharma")
            if clean_name_lower in ex_lower or ex_lower in clean_name_lower:
                return existing

            if fuzz is not None:
                token_set_score = fuzz.token_set_ratio(clean_name_lower, ex_lower)
                token_sort_score = fuzz.token_sort_ratio(clean_name_lower, ex_lower)
                ratio_score = fuzz.ratio(clean_name_lower, ex_lower)
                max_score = max(token_set_score, token_sort_score, ratio_score)

                if max_score >= string_sim_threshold and max_score > highest_string_score:
                    highest_string_score = max_score
                    best_string_match = existing

        if best_string_match and highest_string_score >= string_sim_threshold:
            return best_string_match

        # 3. Dense Embedding Cosine Similarity (threshold matching reconcile.py: 0.75)
        try:
            cand_emb = get_entity_embedding({"canonical_name": clean_name})
            best_emb_match = None
            highest_cos_sim = 0.0

            for existing in existing_names:
                ex_emb = get_entity_embedding({"canonical_name": existing})
                cos_sim = compute_cosine_similarity(cand_emb, ex_emb)
                if cos_sim >= sim_threshold and cos_sim > highest_cos_sim:
                    highest_cos_sim = cos_sim
                    best_emb_match = existing

            if best_emb_match and highest_cos_sim >= sim_threshold:
                return best_emb_match
        except Exception:
            pass

        return None
