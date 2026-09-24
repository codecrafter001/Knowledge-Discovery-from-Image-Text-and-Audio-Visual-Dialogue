import os
import tempfile

os.environ["KD_STORAGE_DIR"] = tempfile.mkdtemp()
os.environ["KD_STUB_STAGE_DELAY"] = "0"
os.environ.setdefault("KD_SPACY_MODEL", "en_core_web_sm")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def upload(client):
    def _upload(filename: str, content: bytes) -> dict:
        res = client.post("/api/v1/documents/upload", files={"file": (filename, content)})
        assert res.status_code == 202, res.text
        # TestClient runs background tasks before returning.
        return client.get(f"/api/v1/documents/{res.json()['id']}").json()
    return _upload
