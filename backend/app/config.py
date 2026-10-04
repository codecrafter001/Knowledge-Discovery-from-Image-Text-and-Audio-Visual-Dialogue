import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
SEED_PATH = APP_DIR / "data" / "seed.json"

STORAGE_DIR = Path(os.getenv("KD_STORAGE_DIR", APP_DIR.parent / "storage"))
UPLOAD_DIR = STORAGE_DIR / "uploads"
DOCUMENTS_DB = STORAGE_DIR / "documents.json"
EXTRACTIONS_DIR = STORAGE_DIR / "extractions"
VECTORS_DIR = STORAGE_DIR / "vectors"
IMAGE_EMBEDDINGS_DIR = STORAGE_DIR / "image_embeddings"

# Path to tesseract.exe when it is not on PATH (the default Windows install folder is also checked).
TESSERACT_CMD = os.getenv("KD_TESSERACT_CMD", "")
CAPTION_MODEL = os.getenv("KD_CAPTION_MODEL", "Salesforce/blip-image-captioning-base")
CLIP_MODEL = os.getenv("KD_CLIP_MODEL", "openai/clip-vit-base-patch32")

EMBED_MODEL = os.getenv("KD_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
# Passages below this cosine similarity are not cited unless keyword or graph search also found them.
MIN_SIMILARITY = float(os.getenv("KD_MIN_SIMILARITY", "0.25"))
SEARCH_TOP_K = int(os.getenv("KD_SEARCH_TOP_K", "5"))

# Serve the demo seed dataset alongside real extractions.
INCLUDE_SEED = os.getenv("KD_INCLUDE_SEED", "1") == "1"

# en_core_web_trf is far more accurate; en_core_web_sm is ~10x faster (used in tests).
SPACY_MODEL = os.getenv("KD_SPACY_MODEL", "en_core_web_trf")

MAX_UPLOAD_BYTES = int(os.getenv("KD_MAX_UPLOAD_MB", "500")) * 1024 * 1024
CORS_ORIGINS = os.getenv("KD_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

# Seconds each stub pipeline stage takes; set to 0 in tests.
STUB_STAGE_DELAY = float(os.getenv("KD_STUB_STAGE_DELAY", "1.0"))

API_VERSION = "0.1.0"
