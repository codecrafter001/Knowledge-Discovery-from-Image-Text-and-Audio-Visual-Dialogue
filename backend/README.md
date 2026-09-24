# Knowledge Discovery API (FastAPI)

Backend for the React frontend.

| Phase | Status |
|---|---|
| 0: API, real uploads, job status | done |
| 1a: Text extraction (PDF/DOCX/TXT/MD/JSON → entities + triples + evidence) | done |
| 1b: Image extraction (OCR, captions, CLIP) | stub: files are stored, no extraction yet |
| 1c: Audio-visual extraction (Whisper, diarization, scenes) | stub: files are stored, no extraction yet |
| 4: Retrieval & search (`/query`) | done |

Pipeline stages/logs and evaluation still return the seed dataset.

## Run

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Then in the frontend, go to Settings and turn off the mock backend. API docs are at http://localhost:8000/docs.

## Test

```powershell
.venv\Scripts\python -m pytest -q          # uses en_core_web_sm (fast)
$env:KD_SPACY_MODEL="en_core_web_trf"; .venv\Scripts\python -m pytest -q tests/test_text_extraction.py
```

## How text extraction works

1. **Load:** PDF text per page (PyMuPDF), DOCX paragraphs, plain text, or string values from JSON.
2. **Entities:** spaCy NER, mapped to the frontend categories (Person, Organization, Location, Technology, Metric, Concept).
3. **Relations:** subject–verb–object patterns from the dependency parse, including verb + preposition
   (`transcribe_into`), passive agents ("X was introduced by Y" → Y introduce X), conjunctions and negation.
   Noun chunks can be relation arguments as well as named entities.
4. **Evidence:** every triple stores its sentence, page, and `charSpan` (character offsets into the document's
   full text), so each fact can be traced back to its exact source text.
5. **Normalization:** entities are keyed on their lowercased and lemmatized text, so the same entity in two documents
   merges into one graph node with both source documents.

Confidence scores are heuristics (named-entity arguments score higher than noun chunks), not model
probabilities.

## How search works

Every sentence of an ingested document becomes a passage, embedded with `all-MiniLM-L6-v2`. `/query` supports
the four modes on the Search page:

| Mode | Method |
|---|---|
| `vector_semantic` | FAISS cosine similarity (passages below `KD_MIN_SIMILARITY`, default 0.25, are dropped) |
| `bm25` | BM25 keyword ranking over stop-word-filtered tokens |
| `knowledge_graph` | Entities named in the query → triples connected to them → those triples' evidence sentences |
| `hybrid_cross_modal` | Reciprocal rank fusion (k=60) of all three |

The answer is **extractive**: the top two passages, verbatim. No LLM generates text. Each citation includes:

- `confidence`: cosine similarity between the query and the passage
- `groundingScore`: the share of query terms that appear in the passage
- `reasoningChain`: lists only the steps that actually ran, with their real counts

Known limitation: the embedding model has no world knowledge. For example, it won't link "speech recognition
model" to "Whisper" unless the text says so.

## Layout

| File | Purpose |
|---|---|
| `app/routes.py` | All `/api/v1` endpoints called by `src/services/api.ts` |
| `app/pipeline.py` | Modality detection and ingestion jobs |
| `app/extractors/text.py` | Text loading, NER, relation extraction, evidence spans |
| `app/vectors.py` | Passage embeddings, per-document `.npy` vectors, FAISS + BM25 index |
| `app/search.py` | Query engine: semantic / keyword / graph retrieval, rank fusion, citations |
| `app/knowledge.py` | Merges per-document extractions into entities / triplets / evidence / relations / graph |
| `app/store.py` | Seed data and uploaded-document records (`storage/documents.json`) |
| `app/config.py` | Env settings: `KD_STORAGE_DIR`, `KD_SPACY_MODEL`, `KD_EMBED_MODEL`, `KD_MIN_SIMILARITY`, `KD_SEARCH_TOP_K`, `KD_INCLUDE_SEED`, `KD_MAX_UPLOAD_MB`, `KD_CORS_ORIGINS` |

Set `KD_INCLUDE_SEED=0` to hide the demo dataset and show only your own extractions.
