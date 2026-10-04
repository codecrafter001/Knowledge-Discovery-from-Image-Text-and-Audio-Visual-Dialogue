# Multimodal Knowledge Discovery Platform 🔍⚡

A multimodal knowledge discovery mono-repo platform combining FastAPI, Neo4j Graph Database, MongoDB Document Store, FAISS Vector Indexing, and React (Vite).

---

## 📁 Mono-Repo Structure

```
knowledge-discovery/
├── backend/            # FastAPI application (routes, models, core logic)
│   ├── app/            # Main FastAPI endpoints and pipeline modules
│   │   ├── main.py     # Root API entrypoint (GET / returns {"status": "ok"})
│   │   ├── config.py   # System configurations & environment paths
│   │   └── routes.py   # REST API route handlers
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile      # Backend Dockerfile
├── extractors/         # Multimodal extraction modules (OCR, Vision, Speech stubs)
│   ├── ocr.py          # Optical Character Recognition (pytesseract, easyocr)
│   ├── vision.py       # Visual feature & CLIP embeddings
│   └── speech.py       # Speech-to-text & speaker diarization (Whisper)
├── fusion/             # Multimodal fusion engine stub
│   └── fusion_engine.py # Cross-modal alignment and joint representations
├── storage/            # Neo4j Graph & FAISS Vector Index interface code
│   ├── neo4j_client.py # Neo4j Graph Database connector & Cypher execution
│   └── faiss_index.py  # FAISS Vector Index similarity search
├── agents/             # Autonomous agent workflows
│   └── repair_agent.py # Self-healing repair agent placeholder
├── frontend/           # React application (Vite, plain JavaScript)
│   ├── src/            # React components and root API status check
│   ├── package.json    # Frontend dependencies
│   └── vite.config.js  # Vite server and proxy configuration
├── docker/             # Docker infrastructure
│   ├── Dockerfile.api  # FastAPI container definition
│   └── docker-compose.yml # Compose file for API, Neo4j, and MongoDB
├── docker-compose.yml  # Root compose file
├── requirements.txt    # Pinned Python dependencies
└── README.md           # Project documentation
```

---

## 🚀 Quick Start with Docker Compose

### 1. Start Services
Run the following command in the project root:

```bash
docker compose up -d
```
*(Or navigate to `docker/` and run `docker compose up -d`)*

This starts three containerized services:
- **`api`**: FastAPI backend on [http://localhost:8000](http://localhost:8000)
- **`neo4j`**: Neo4j Graph Database on [http://localhost:7474](http://localhost:7474) (Bolt: `7687`)
- **`mongo`**: MongoDB Document Store on `localhost:27017`

### 2. Verify Service Reachability

| Service | Address | Verification Command | Expected Output |
|---|---|---|---|
| **FastAPI Backend** | `http://localhost:8000/` | `curl http://localhost:8000/` | `{"status":"ok"}` |
| **Neo4j Browser** | `http://localhost:7474/` | Open browser at `http://localhost:7474` | Neo4j Web Console (user: `neo4j`, pass: `password`) |
| **MongoDB** | `localhost:27017` | `docker exec -it kd-mongo mongosh --eval "db.adminCommand('ping')"` | `{ ok: 1 }` |

---

## 💻 Running Frontend (React + Vite)

1. Navigate to the `frontend/` directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser at **[http://localhost:5173](http://localhost:5173)**.  
The page will connect to `http://localhost:8000/` and display:
```json
{
  "status": "ok"
}
```
with an active **"API CONNECTED"** status badge.

---

## 🐍 Local Python Virtual Environment Setup

To run or develop backend modules locally without Docker:

```bash
# 1. Create Python 3.11 virtual environment
python -m venv .venv

# 2. Activate virtual environment
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# 3. Install pinned dependencies
pip install -r requirements.txt

# 4. Start FastAPI server locally
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📦 Pinned Python Dependencies

The `requirements.txt` file pins the following core libraries:
- **Vision & OCR**: `opencv-python-headless`, `pillow`, `pytesseract`, `easyocr`
- **NLP & Transformers**: `spacy`, `transformers`
- **Speech & Audio**: `openai-whisper`, `pyannote.audio`
- **API & Server**: `fastapi`, `uvicorn`, `python-multipart`
- **Databases & Vector Indexing**: `neo4j`, `faiss-cpu`, `pymongo`
