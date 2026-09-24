"""Text extractor: document -> entity mentions + subject/predicate/object triples.

Every mention and triple carries its evidence: page number and character span into
the document's full text (pages joined with a blank line).

Relations come from dependency-parse SVO patterns. Confidence values are heuristics
based on argument type (named entity vs. noun chunk), not model probabilities.
"""
import json
import re
import threading
from dataclasses import dataclass
from pathlib import Path

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

PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")

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


# Loading

def _pages(path: Path) -> list[tuple[str, int | None]]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        import pymupdf

        with pymupdf.open(path) as pdf:
            return [(page.get_text(), i + 1) for i, page in enumerate(pdf)]
    if suffix == ".docx":
        import docx

        return [("\n\n".join(p.text for p in docx.Document(str(path)).paragraphs), None)]
    raw = path.read_text(encoding="utf-8", errors="replace")
    if suffix == ".json":
        try:
            raw = "\n\n".join(_json_strings(json.loads(raw)))
        except json.JSONDecodeError:
            pass
    return [(raw, None)]


def _json_strings(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        value = list(value.values())
    if isinstance(value, list):
        return [s for v in value for s in _json_strings(v)]
    return []


def load_segments(path: Path) -> tuple[str, list[Segment], int]:
    """Return (full_text, paragraph segments, page_count)."""
    pages = _pages(path)
    segments: list[Segment] = []
    parts: list[str] = []
    offset = 0
    for text, page in pages:
        pos = 0
        for para in PARAGRAPH_SPLIT.split(text):
            start = text.index(para, pos)
            pos = start + len(para)
            if para.strip():
                segments.append(Segment(para, page, offset + start))
        parts.append(text)
        offset += len(text) + 2
    return "\n\n".join(parts), segments, len(pages)


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
    }


def extract(path: Path) -> dict:
    full_text, segments, page_count = load_segments(path)
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
            passages.append({"text": sentence, "page": seg.page, "charSpan": [sent_start, sent_start + len(sentence)]})
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
                        "charSpan": [sent_start, sent_start + len(sentence)],
                    })

    return {
        "extractor": f"text/spacy:{config.SPACY_MODEL}",
        "fullText": full_text,
        "summary": " ".join(p["text"] for p in passages[:3])[:400],
        "pageCount": page_count,
        "tokenCount": token_count,
        "mentions": mentions,
        "triples": triples,
        "passages": passages,
    }

