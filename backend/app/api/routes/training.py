from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.training import (
    ModelRecord,
    PipelineRecord,
    PipelineRunRecord,
    PipelineStepRecord,
    SettingRecord,
    TrainingRun,
)
from app.schemas.training import (
    ModelCreate,
    ModelItem,
    ModelUpdate,
    PipelineCreate,
    PipelineDetail,
    PipelineItem,
    PipelineRunItem,
    PipelineStepCreate,
    PipelineStepItem,
    SettingItem,
    SettingsBulkUpdate,
    SettingUpdate,
    TrainingRunCreate,
    TrainingRunItem,
    TrainingRunUpdate,
)

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Training Runs
# ---------------------------------------------------------------------------


@router.get("/training", response_model=list[TrainingRunItem])
def list_training_runs(
    project_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[TrainingRunItem]:
    query = db.query(TrainingRun)
    if project_id is not None:
        query = query.filter(TrainingRun.project_id == project_id)
    if status is not None:
        query = query.filter(TrainingRun.status == status)
    rows = query.order_by(TrainingRun.created_at.desc()).all()
    return [_training_run_to_item(r) for r in rows]


@router.get("/training/{run_id}", response_model=TrainingRunItem)
def get_training_run(run_id: int, db: Session = Depends(get_db)) -> TrainingRunItem:
    row = db.get(TrainingRun, run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training run not found")
    return _training_run_to_item(row)


@router.post("/training", response_model=TrainingRunItem, status_code=201)
def create_training_run(payload: TrainingRunCreate, db: Session = Depends(get_db)) -> TrainingRunItem:
    row = TrainingRun(
        name=payload.name or f"{payload.model_name} training",
        model_name=payload.model_name,
        dataset_id=payload.dataset_id,
        project_id=payload.project_id,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        image_size=payload.image_size,
        optimizer=payload.optimizer,
        learning_rate=payload.learning_rate,
        device=payload.device,
        status="Running",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _training_run_to_item(row)


@router.patch("/training/{run_id}", response_model=TrainingRunItem)
def update_training_run(run_id: int, payload: TrainingRunUpdate, db: Session = Depends(get_db)) -> TrainingRunItem:
    row = db.get(TrainingRun, run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training run not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _training_run_to_item(row)


@router.delete("/training/{run_id}", status_code=204)
def delete_training_run(run_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(TrainingRun, run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Training run not found")
    db.delete(row)
    db.commit()


def _training_run_to_item(row: TrainingRun) -> TrainingRunItem:
    return TrainingRunItem(
        id=row.id,
        project_id=row.project_id,
        dataset_id=row.dataset_id,
        name=row.name,
        model_name=row.model_name,
        status=row.status,
        epochs=row.epochs,
        current_epoch=row.current_epoch,
        batch_size=row.batch_size,
        image_size=row.image_size,
        optimizer=row.optimizer,
        learning_rate=row.learning_rate,
        best_map50=row.best_map50,
        best_map50_95=row.best_map50_95,
        precision=row.precision,
        recall=row.recall,
        box_loss=row.box_loss,
        obj_loss=row.obj_loss,
        cls_loss=row.cls_loss,
        device=row.device,
        elapsed_seconds=row.elapsed_seconds,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


@router.get("/models", response_model=list[ModelItem])
def list_models(
    project_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[ModelItem]:
    query = db.query(ModelRecord)
    if project_id is not None:
        query = query.filter(ModelRecord.project_id == project_id)
    if status is not None:
        query = query.filter(ModelRecord.status == status)
    rows = query.order_by(ModelRecord.created_at.desc()).all()
    return [_model_to_item(r) for r in rows]


@router.get("/models/{model_id}", response_model=ModelItem)
def get_model(model_id: int, db: Session = Depends(get_db)) -> ModelItem:
    row = db.get(ModelRecord, model_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return _model_to_item(row)


@router.post("/models", response_model=ModelItem, status_code=201)
def create_model(payload: ModelCreate, db: Session = Depends(get_db)) -> ModelItem:
    row = ModelRecord(
        name=payload.name,
        model_type=payload.model_type,
        architecture=payload.architecture,
        framework=payload.framework,
        dataset_name=payload.dataset_name,
        project_id=payload.project_id,
        training_run_id=payload.training_run_id,
        version=payload.version,
        file_path=payload.file_path,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _model_to_item(row)


@router.patch("/models/{model_id}", response_model=ModelItem)
def update_model(model_id: int, payload: ModelUpdate, db: Session = Depends(get_db)) -> ModelItem:
    row = db.get(ModelRecord, model_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return _model_to_item(row)


@router.delete("/models/{model_id}", status_code=204)
def delete_model(model_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(ModelRecord, model_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(row)
    db.commit()


def _model_to_item(row: ModelRecord) -> ModelItem:
    return ModelItem(
        id=row.id,
        project_id=row.project_id,
        training_run_id=row.training_run_id,
        name=row.name,
        model_type=row.model_type,
        architecture=row.architecture,
        framework=row.framework,
        dataset_name=row.dataset_name,
        status=row.status,
        version=row.version,
        file_path=row.file_path,
        file_size_bytes=row.file_size_bytes,
        map50=row.map50,
        map50_95=row.map50_95,
        precision=row.precision,
        recall=row.recall,
        f1_score=row.f1_score,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ---------------------------------------------------------------------------
# Pipelines
# ---------------------------------------------------------------------------


@router.get("/pipelines", response_model=list[PipelineItem])
def list_pipelines(
    project_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[PipelineItem]:
    query = db.query(PipelineRecord)
    if project_id is not None:
        query = query.filter(PipelineRecord.project_id == project_id)
    rows = query.order_by(PipelineRecord.created_at.desc()).all()
    return [_pipeline_to_item(r) for r in rows]


@router.get("/pipelines/{pipeline_id}", response_model=PipelineDetail)
def get_pipeline(pipeline_id: int, db: Session = Depends(get_db)) -> PipelineDetail:
    row = db.get(PipelineRecord, pipeline_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    steps = db.query(PipelineStepRecord).filter(PipelineStepRecord.pipeline_id == pipeline_id).order_by(PipelineStepRecord.step_order).all()
    runs = db.query(PipelineRunRecord).filter(PipelineRunRecord.pipeline_id == pipeline_id).order_by(PipelineRunRecord.created_at.desc()).all()
    item = _pipeline_to_item(row)
    return PipelineDetail(
        **item.model_dump(),
        steps=[_step_to_item(s) for s in steps],
        runs=[_run_to_item(r) for r in runs],
    )


@router.post("/pipelines", response_model=PipelineItem, status_code=201)
def create_pipeline(payload: PipelineCreate, db: Session = Depends(get_db)) -> PipelineItem:
    row = PipelineRecord(
        name=payload.name,
        description=payload.description,
        template=payload.template,
        project_id=payload.project_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _pipeline_to_item(row)


@router.post("/pipelines/{pipeline_id}/steps", response_model=PipelineStepItem, status_code=201)
def add_pipeline_step(pipeline_id: int, payload: PipelineStepCreate, db: Session = Depends(get_db)) -> PipelineStepItem:
    pipeline = db.get(PipelineRecord, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    max_order = db.query(PipelineStepRecord).filter(PipelineStepRecord.pipeline_id == pipeline_id).count()
    step = PipelineStepRecord(
        pipeline_id=pipeline_id,
        step_order=max_order + 1,
        name=payload.name,
        step_type=payload.step_type,
        config_json=payload.config_json,
    )
    db.add(step)
    pipeline.total_steps = max_order + 1
    db.commit()
    db.refresh(step)
    return _step_to_item(step)


@router.post("/pipelines/{pipeline_id}/run", response_model=PipelineRunItem, status_code=201)
def start_pipeline_run(pipeline_id: int, db: Session = Depends(get_db)) -> PipelineRunItem:
    pipeline = db.get(PipelineRecord, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    last_run = db.query(PipelineRunRecord).filter(PipelineRunRecord.pipeline_id == pipeline_id).order_by(PipelineRunRecord.run_number.desc()).first()
    run_number = (last_run.run_number + 1) if last_run else 1
    run = PipelineRunRecord(pipeline_id=pipeline_id, run_number=run_number, status="Running")
    db.add(run)
    pipeline.status = "Running"
    pipeline.current_step = 1
    db.commit()
    db.refresh(run)
    return _run_to_item(run)


@router.delete("/pipelines/{pipeline_id}", status_code=204)
def delete_pipeline(pipeline_id: int, db: Session = Depends(get_db)) -> None:
    row = db.get(PipelineRecord, pipeline_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    db.query(PipelineStepRecord).filter(PipelineStepRecord.pipeline_id == pipeline_id).delete()
    db.query(PipelineRunRecord).filter(PipelineRunRecord.pipeline_id == pipeline_id).delete()
    db.delete(row)
    db.commit()


def _pipeline_to_item(row: PipelineRecord) -> PipelineItem:
    return PipelineItem(
        id=row.id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        status=row.status,
        template=row.template,
        total_steps=row.total_steps,
        current_step=row.current_step,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _step_to_item(row: PipelineStepRecord) -> PipelineStepItem:
    return PipelineStepItem(
        id=row.id,
        pipeline_id=row.pipeline_id,
        step_order=row.step_order,
        name=row.name,
        step_type=row.step_type,
        status=row.status,
        config_json=row.config_json,
        duration_seconds=row.duration_seconds,
        created_at=row.created_at,
    )


def _run_to_item(row: PipelineRunRecord) -> PipelineRunItem:
    return PipelineRunItem(
        id=row.id,
        pipeline_id=row.pipeline_id,
        run_number=row.run_number,
        status=row.status,
        duration_seconds=row.duration_seconds,
        created_at=row.created_at,
    )


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS: list[tuple[str, str, str]] = [
    ("workspace_name", "MLForge Workspace", "general"),
    ("workspace_description", "Primary ML workspace for object detection projects", "general"),
    ("workspace_owner", "Admin", "general"),
    ("default_task", "Object Detection", "general"),
    ("data_directory", "/data/mlforge", "storage"),
    ("dataset_storage", "/data/mlforge/datasets", "storage"),
    ("model_storage", "/data/mlforge/models", "storage"),
    ("export_directory", "/data/mlforge/exports", "storage"),
    ("default_model", "YOLOv8s", "training"),
    ("default_image_size", "640", "training"),
    ("default_batch_size", "16", "training"),
    ("default_epochs", "50", "training"),
    ("default_optimizer", "SGD", "training"),
    ("default_learning_rate", "0.01", "training"),
    ("auto_save_annotations", "true", "features"),
    ("auto_scan_sources", "true", "features"),
    ("enable_video_extraction", "true", "features"),
    ("show_preview_thumbnails", "true", "features"),
    ("enable_experiment_tracking", "false", "features"),
    ("dark_mode", "false", "features"),
]


def _ensure_defaults(db: Session) -> None:
    existing = {r.key for r in db.query(SettingRecord.key).all()}
    for key, value, category in DEFAULT_SETTINGS:
        if key not in existing:
            db.add(SettingRecord(key=key, value=value, category=category))
    db.commit()


@router.get("/settings", response_model=list[SettingItem])
def list_settings(category: str | None = None, db: Session = Depends(get_db)) -> list[SettingItem]:
    _ensure_defaults(db)
    query = db.query(SettingRecord)
    if category is not None:
        query = query.filter(SettingRecord.category == category)
    rows = query.order_by(SettingRecord.category, SettingRecord.key).all()
    return [SettingItem(key=r.key, value=r.value, category=r.category) for r in rows]


@router.put("/settings/{key}", response_model=SettingItem)
def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)) -> SettingItem:
    row = db.query(SettingRecord).filter(SettingRecord.key == key).first()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    row.value = payload.value
    db.commit()
    db.refresh(row)
    return SettingItem(key=row.key, value=row.value, category=row.category)


@router.put("/settings", response_model=list[SettingItem])
def bulk_update_settings(payload: SettingsBulkUpdate, db: Session = Depends(get_db)) -> list[SettingItem]:
    _ensure_defaults(db)
    results: list[SettingItem] = []
    for item in payload.settings:
        row = db.query(SettingRecord).filter(SettingRecord.key == item.key).first()
        if row is None:
            row = SettingRecord(key=item.key, value=item.value, category=item.category)
            db.add(row)
        else:
            row.value = item.value
        results.append(SettingItem(key=item.key, value=item.value, category=item.category))
    db.commit()
    return results
