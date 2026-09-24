from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .routes import router

app = FastAPI(title="Knowledge Discovery API", version=config.API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
