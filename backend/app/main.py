from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routes import router
from .preprocessing_routes import router as preprocessing_router
from .extraction_routes import router as extraction_router
from .nlu_routes import router as nlu_router
from .fusion_routes import router as fusion_router
from .storage_routes import router as storage_router

app = FastAPI(title="Knowledge Discovery API", version=config.API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok", "version": config.API_VERSION}

app.include_router(router, prefix="/api/v1")
app.include_router(preprocessing_router)
app.include_router(extraction_router)
app.include_router(nlu_router)
app.include_router(fusion_router)
app.include_router(storage_router)
