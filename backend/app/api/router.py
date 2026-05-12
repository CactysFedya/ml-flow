from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.workspace import router as workspace_router


api_router = APIRouter()
api_router.include_router(dashboard_router)
api_router.include_router(workspace_router)
