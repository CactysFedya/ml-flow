from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.dashboard import DashboardPayload
from app.services.dashboard_service import get_dashboard_payload


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardPayload)
def read_dashboard(
    project_id: int | None = Query(default=None),
    dataset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> DashboardPayload:
    return get_dashboard_payload(db, project_id=project_id, dataset_id=dataset_id)
