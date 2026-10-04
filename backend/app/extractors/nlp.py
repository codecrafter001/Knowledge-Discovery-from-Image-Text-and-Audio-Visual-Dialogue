"""Shared NLP analysis: text segments -> entity mentions, subject/predicate/object triples
and sentence passages.

Each segment carries its location in the document's full text (offset) plus optional
evidence metadata (e.g. an OCR block's bounding box), which is copied onto every
mention, triple and passage produced from it.

Relations come from dependency-parse SVO patterns. Confidence values are heuristics
based on argument type (named entity vs. noun chunk), not model probabilities.
"""
import re
import threading
from dataclasses import dataclass, field

import spacy
from spacy.tokens import Span, Token

from .. import config

# spaCy NER label -> frontend Entity.category. Labels not listed are ignored.
LABEL_CATEGORY = {
    "PERSON": "Person",
    "NORP": "Organization",
    "ORG": "Organization",
    "GPE": "Location",
    "LOC": "Location",
    "FAC": "Location",
    "PRODUCT": "Technology",
    "WORK_OF_ART": "Concept",
    "EVENT": "Concept",
    "LAW": "Concept",
    "LANGUAGE": "Concept",
    "PERCENT": "Metric",
    "MONEY": "Metric",
    "QUANTITY": "Metric",
}

SUBJECT_DEPS = {"nsubj", "nsubjpass"}
OBJECT_DEPS = {"dobj", "attr", "oprd", "dative"}
DROP_PREFIX_DEPS = {"det", "poss", "predet"}

_nlp = None
_nlp_lock = threading.Lock()


def get_nlp():
    global _nlp
    with _nlp_lock:
        if _nlp is None:
            _nlp = spacy.load(config.SPACY_MODEL)
        return _nlp


@dataclass
class Segment:
    text: str
    page: int | None
    offset: int  # character offset of this segment in the full document text
    meta: dict = field(default_factory=dict)  # evidence copied onto derived mentions/triples/passages


def join_segments(texts: list[tuple[str, dict]]) -> tuple[str, list[Segment]]:
    """Lay out standalone texts (e.g. OCR blocks) as one document separated by blank lines."""
    segments, offset = [], 0
    for text, meta in texts:
        segments.append(Segment(text, None, offset, meta))
        offset += len(text) + 2
    return "\n\n".join(t for t, _ in texts), segments


# Entities

def _clean_span(span: Span) -> Span | None:
    start = span.start
    while start < span.end and span.doc[start].dep_ in DROP_PREFIX_DEPS:
        start += 1
    if start >= span.end:
        return None
    span = span.doc[start:span.end]
    if all(t.is_stop or t.is_punct or t.pos_ == "PRON" for t in span):
        return None
    return span


def entity_key(span: Span) -> str:
    if span.label_:
        text = span.text
    else:
        text = " ".join(t.lemma_ for t in span)
    return re.sub(r"\s+", " ", text).strip().lower()


def _argument_span(token: Token, ents: dict[int, Span]) -> Span | None:
    """Named entity or noun chunk covering the token, else the bare noun."""
    if token.i in ents:
        return ents[token.i]
    for chunk in token.doc.noun_chunks:
        if chunk.start <= token.i < chunk.end:
            return _clean_span(chunk)
    if token.pos_ in {"NOUN", "PROPN"}:
        return token.doc[token.i:token.i + 1]
    return None


# Relations

def _subjects(verb: Token) -> list[Token]:
    subs = [c for c in verb.children if c.dep_ in SUBJECT_DEPS]
    if not subs and verb.dep_ == "conj" and verb.head.pos_ in {"VERB", "AUX"}:
        return _subjects(verb.head)
    return subs


def _with_conjuncts(tokens: list[Token]) -> list[Token]:
    return [x for t in tokens for x in (t, *t.conjuncts)]


def _verb_triples(verb: Token) -> list[tuple[Token, str, Token]]:
    """(subject_token, predicate, object_token) triples rooted at one verb."""
    negated = any(c.dep_ == "neg" for c in verb.children)
    base = ("not_" if negated else "") + verb.lemma_.lower()
    subjects = _with_conjuncts(_subjects(verb))
    passive = any(s.dep_ == "nsubjpass" for s in subjects)

    objects: list[tuple[str, Token]] = [
        (base, o) for o in _with_conjuncts([c for c in verb.children if c.dep_ in OBJECT_DEPS])
    ]
    agents: list[Token] = []
    for child in verb.children:
        if child.dep_ == "prep":
            for pobj in _with_conjuncts([c for c in child.children if c.dep_ == "pobj"]):
                objects.append((f"{base}_{child.lower_}", pobj))
        elif child.dep_ == "agent":
            agents += _with_conjuncts([c for c in child.children if c.dep_ == "pobj"])

    triples = []
    if passive and agents:
        # "X was released by Y" -> (Y, release, X)
        triples += [(a, base, s) for a in agents for s in subjects]
    else:
        triples += [(s, pred, o) for s in subjects for pred, o in objects]
    return triples


def _confidence(*spans: Span) -> float:
    return round(min(0.9, 0.55 + 0.15 * sum(bool(s.label_) for s in spans)), 2)


def _mention(span: Span, seg: Segment) -> dict:
    return {
        "key": entity_key(span),
        "name": span.text,
        "category": LABEL_CATEGORY.get(span.label_, "Concept"),
        "label": span.label_ or "NOUN_CHUNK",
        "page": seg.page,
        "charSpan": [seg.offset + span.start_char, seg.offset + span.end_char],
        "confidence": 0.85 if span.label_ else 0.6,
        **seg.meta,
    }


def analyze(segments: list[Segment]) -> dict:
    """Return mentions, triples, sentence passages and token count for the segments."""
    nlp = get_nlp()

    mentions: list[dict] = []
    triples: list[dict] = []
    seen_mentions: set[tuple[int, int]] = set()
    passages: list[dict] = []  # every sentence, for retrieval
    token_count = 0

    def add_mention(span: Span, seg: Segment):
        m = _mention(span, seg)
        pos = tuple(m["charSpan"])
        if pos not in seen_mentions:
            seen_mentions.add(pos)
            mentions.append(m)
        return m

    for seg, doc in zip(segments, nlp.pipe(s.text for s in segments)):
        token_count += len(doc)
        ents = {}
        for ent in doc.ents:
            if ent.label_ in LABEL_CATEGORY and (clean := _clean_span(ent)) is not None:
                clean.label_ = ent.label_
                add_mention(clean, seg)
                for t in clean:
                    ents[t.i] = clean

        for sent in doc.sents:
            sentence = sent.text.strip()
            if not sentence:
                continue
            sent_start = seg.offset + sent.start_char + sent.text.index(sentence)
            span = [sent_start, sent_start + len(sentence)]
            passages.append({"text": sentence, "page": seg.page, "charSpan": span, **seg.meta})
            seen_triples: set[tuple[str, str, str]] = set()
            for verb in (t for t in sent if t.pos_ in {"VERB", "AUX"}):
                for s_tok, predicate, o_tok in _verb_triples(verb):
                    subj, obj = _argument_span(s_tok, ents), _argument_span(o_tok, ents)
                    if subj is None or obj is None:
                        continue
                    s_m, o_m = add_mention(subj, seg), add_mention(obj, seg)
                    if s_m["key"] == o_m["key"] or (s_m["key"], predicate, o_m["key"]) in seen_triples:
                        continue
                    seen_triples.add((s_m["key"], predicate, o_m["key"]))
                    triples.append({
                        "subjectKey": s_m["key"],
                        "predicate": predicate,
                        "objectKey": o_m["key"],
                        "confidence": _confidence(subj, obj),
                        "sentence": sentence,
                        "page": seg.page,
                        "charSpan": span,
                        **seg.meta,
                    })

    return {"mentions": mentions, "triples": triples, "passages": passages, "tokenCount": token_count}
