"""
Relation extraction module.

APPROACH NOTE:
This implementation utilizes a spaCy dependency-parse-based heuristic for relation extraction.
Dependency parsing maps grammatical relations (nominal subjects 'nsubj', direct objects 'dobj',
prepositional objects 'pobj', attributes 'attr', passive agents 'agent', and verb predicates)
between detected entities and noun chunks in the sentence.
This approach is deterministic, fast, offline-ready, and aligns accurately with entity spans.
"""

from typing import Any, Dict, List, Optional, Tuple
import spacy

from .entities import get_nlp


def find_entity_at_token(token, entities_by_char: Dict[Tuple[int, int], str]) -> Optional[str]:
    """Check if a token falls within any recognized entity span."""
    t_start = token.idx
    t_end = token.idx + len(token.text)
    for (e_start, e_end), ent_text in entities_by_char.items():
        if e_start <= t_start and t_end <= e_end:
            return ent_text
        if max(t_start, e_start) < min(t_end, e_end):
            return ent_text
    return None


def extract_relations(text: str, entities: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Extract (Subject, Relation, Object) semantic triples from text and entity spans.

    Args:
        text: Input string (or coreference-resolved text).
        entities: List of extracted entities from extract_entities().

    Returns:
        List of dicts:
        [{"subject": str, "relation": str, "object": str, "confidence": float}, ...]
    """
    if not text or not isinstance(text, str) or not text.strip():
        return []

    nlp = get_nlp()
    doc = nlp(text)

    # Index entities by character spans for quick lookup
    entities_by_char: Dict[Tuple[int, int], str] = {}
    entity_texts = set()
    if entities:
        for ent in entities:
            e_text = ent.get("text", "").strip()
            if e_text:
                start_c = int(ent.get("start_char", 0))
                end_c = int(ent.get("end_char", 0))
                entities_by_char[(start_c, end_c)] = e_text
                entity_texts.add(e_text.lower())

    relations: List[Dict[str, Any]] = []
    seen_triples = set()

    for sent in doc.sents:
        # Find verbs that act as predicates
        for token in sent:
            if token.pos_ not in ["VERB", "AUX"]:
                continue

            subjects = []
            objects = []

            # Examine children of the verb
            for child in token.children:
                # 1. Subjects (active & passive)
                if child.dep_ in ["nsubj", "nsubjpass", "csubj", "csubjpass"]:
                    subj_text = child.text
                    ent_match = find_entity_at_token(child, entities_by_char)
                    if ent_match:
                        subj_text = ent_match
                    else:
                        # Expand noun chunk if available
                        subj_text = "".join(w.text_with_ws for w in child.subtree).strip()
                    subjects.append(subj_text)

                # 2. Direct objects & attributes
                elif child.dep_ in ["dobj", "attr", "acomp", "oprd"]:
                    obj_text = child.text
                    ent_match = find_entity_at_token(child, entities_by_char)
                    if ent_match:
                        obj_text = ent_match
                    else:
                        obj_text = "".join(w.text_with_ws for w in child.subtree).strip()
                    objects.append(obj_text)

                # 3. Prepositional phrases attached to verb
                elif child.dep_ == "prep":
                    prep_lemma = child.lemma_
                    for pchild in child.children:
                        if pchild.dep_ in ["pobj", "pcomp"]:
                            pobj_text = pchild.text
                            ent_match = find_entity_at_token(pchild, entities_by_char)
                            if ent_match:
                                pobj_text = ent_match
                            else:
                                pobj_text = "".join(w.text_with_ws for w in pchild.subtree).strip()
                            objects.append(f"{prep_lemma} {pobj_text}")

            # Predicate relation lemma/phrase
            relation_str = token.lemma_

            # Build relation triples for found (subject, object) pairs
            for subj in subjects:
                for obj in objects:
                    if not subj or not obj or subj.lower() == obj.lower():
                        continue

                    # Determine confidence: higher if subject or object matches a recognized named entity
                    is_entity_rel = (
                        subj.lower() in entity_texts or obj.lower() in entity_texts
                    )
                    confidence = 0.90 if is_entity_rel else 0.75

                    triple_key = (subj.lower(), relation_str.lower(), obj.lower())
                    if triple_key not in seen_triples:
                        seen_triples.add(triple_key)
                        relations.append({
                            "subject": subj,
                            "relation": relation_str,
                            "object": obj,
                            "confidence": confidence,
                        })

    return relations
