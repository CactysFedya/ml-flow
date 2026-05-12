from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.db.base import Base
from app.db.session import engine
from app.models import Dataset, DatasetEventRecord, DatasetRecord, DatasetSourceRecord, Experiment, ModelRecord, PipelineRecord, PipelineRunRecord, PipelineStepRecord, Project, ProjectRecord, SettingRecord, TrainingRun  # noqa: F401


def create_app() -> FastAPI:
    Base.metadata.create_all(bind=engine)

    app = FastAPI(title="MLForge v2 API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router)
    return app


app = create_app()
