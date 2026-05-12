from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.api.deps import get_db
from app.api.router import api_router
from app.models import (  # noqa: F401 – ensure models registered with Base
    Dataset, DatasetEventRecord, DatasetRecord, DatasetSourceRecord,
    Experiment, ModelRecord, PipelineRecord, PipelineRunRecord,
    PipelineStepRecord, Project, ProjectRecord, SettingRecord, TrainingRun,
)

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSession = sessionmaker(bind=_test_engine, autoflush=False, autocommit=False, future=True)


def _build_test_app() -> FastAPI:
    app = FastAPI(title="MLForge v2 API – test")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router)
    return app


@pytest.fixture(autouse=True)
def _setup_tables():
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture()
def db_session():
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session: Session):
    app = _build_test_app()

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
