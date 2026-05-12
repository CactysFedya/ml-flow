from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.dataset_scanner import IMAGE_SUFFIXES, VIDEO_SUFFIXES
from app.schemas.workspace import (
    DatasetAnnotationItem,
    DatasetAnnotationPayload,
    DatasetClassCreate,
    DatasetClassItem,
    DatasetClassesImport,
    DatasetCreate,
    DatasetEventItem,
    DatasetExportSummary,
    DatasetMediaBulkPayload,
    DatasetMediaBulkSummary,
    DatasetFrameExtractionRequest,
    DatasetFrameExtractionSummary,
    DatasetImport,
    DatasetItem,
    DatasetMediaItem,
    DatasetSourceAddSummary,
    DatasetSourceCreate,
    DatasetSourceItem,
    DatasetSplitCreate,
    DatasetSplitItem,
    DatasetTagCatalogItem,
    DatasetTagCatalogPayload,
    DatasetUpdate,
    DatasetUploadSummary,
    DatasetVideoPlanRequest,
    DatasetVideoPlanSummary,
    DatasetVersionCreate,
    DatasetVersionSummary,
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.services.workspace_service import (
    add_dataset_class,
    apply_dataset_media_bulk_action,
    get_dataset_annotation,
    add_dataset_source,
    add_dataset_split,
    create_dataset,
    create_project,
    create_dataset_version,
    delete_project,
    delete_dataset,
    delete_dataset_media,
    get_dataset,
    get_dataset_classes,
    get_dataset_media,
    get_dataset_tag_catalog,
    get_project,
    import_dataset_classes,
    import_dataset,
    list_dataset_events,
    list_dataset_sources,
    list_dataset_splits,
    list_dataset_versions,
    list_datasets,
    list_projects,
    open_dataset_folder,
    open_project_folder,
    extract_dataset_source_frames,
    export_dataset_version_yolo,
    preview_dataset_video_plan,
    rebuild_dataset_version_manifest,
    rescan_dataset,
    save_dataset_annotation,
    update_dataset,
    update_project,
    update_dataset_tag_catalog,
    upload_dataset_assets,
)


router = APIRouter(tags=["workspace"])


@router.get("/api/projects", response_model=list[ProjectSummary])
def read_projects(db: Session = Depends(get_db)) -> list[ProjectSummary]:
    return list_projects(db)


@router.post("/api/projects", response_model=ProjectDetail)
def add_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectDetail:
    return create_project(db, payload)


@router.get("/api/projects/{project_id}", response_model=ProjectDetail)
def read_project(project_id: int, db: Session = Depends(get_db)) -> ProjectDetail:
    try:
        return get_project(db, project_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/api/projects/{project_id}", response_model=ProjectDetail)
def patch_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)) -> ProjectDetail:
    try:
        return update_project(db, project_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/projects/{project_id}", status_code=204)
def remove_project(project_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_project(db, project_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.post("/api/projects/{project_id}/open-folder")
def open_project_storage_folder(project_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        return open_project_folder(db, project_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets", response_model=list[DatasetItem])
def read_datasets(db: Session = Depends(get_db)) -> list[DatasetItem]:
    return list_datasets(db)


@router.post("/api/datasets", response_model=DatasetItem)
def add_dataset(payload: DatasetCreate, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return create_dataset(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/import", response_model=DatasetItem)
def import_dataset_folder(payload: DatasetImport, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return import_dataset(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}", response_model=DatasetItem)
def read_dataset(dataset_id: int, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return get_dataset(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/api/datasets/{dataset_id}", response_model=DatasetItem)
def patch_dataset(dataset_id: int, payload: DatasetUpdate, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return update_dataset(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/api/datasets/{dataset_id}", status_code=204)
def remove_dataset(dataset_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_dataset(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=204)


@router.delete("/api/datasets/{dataset_id}/media", response_model=DatasetItem)
def remove_dataset_media(dataset_id: int, path: str, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return delete_dataset_media(db, dataset_id, path)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/media/bulk", response_model=DatasetMediaBulkSummary)
def bulk_update_dataset_media(dataset_id: int, payload: DatasetMediaBulkPayload, db: Session = Depends(get_db)) -> DatasetMediaBulkSummary:
    try:
        return apply_dataset_media_bulk_action(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/rescan", response_model=DatasetItem)
def rescan_dataset_folder(dataset_id: int, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return rescan_dataset(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/media", response_model=list[DatasetMediaItem])
def read_dataset_media(
    dataset_id: int,
    annotated: str | None = None,
    kind: str | None = None,
    limit: int = Query(default=500, ge=1, le=2000),
    search: str | None = None,
    split: str | None = None,
    verified: str | None = None,
    db: Session = Depends(get_db),
) -> list[DatasetMediaItem]:
    try:
        return get_dataset_media(
            db,
            dataset_id,
            annotated=annotated,
            kind=kind,
            limit=limit,
            search=search,
            split=split,
            verified=verified,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/annotations", response_model=DatasetAnnotationItem)
def read_dataset_annotation(dataset_id: int, path: str, db: Session = Depends(get_db)) -> DatasetAnnotationItem:
    try:
        return get_dataset_annotation(db, dataset_id, path)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/api/datasets/{dataset_id}/annotations", response_model=DatasetAnnotationItem)
def write_dataset_annotation(dataset_id: int, payload: DatasetAnnotationPayload, db: Session = Depends(get_db)) -> DatasetAnnotationItem:
    try:
        return save_dataset_annotation(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/tags", response_model=DatasetTagCatalogItem)
def read_dataset_tag_catalog(dataset_id: int, db: Session = Depends(get_db)) -> DatasetTagCatalogItem:
    try:
        return get_dataset_tag_catalog(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/api/datasets/{dataset_id}/tags", response_model=DatasetTagCatalogItem)
def write_dataset_tag_catalog(dataset_id: int, payload: DatasetTagCatalogPayload, db: Session = Depends(get_db)) -> DatasetTagCatalogItem:
    try:
        return update_dataset_tag_catalog(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/classes", response_model=list[DatasetClassItem])
def read_dataset_classes(dataset_id: int, db: Session = Depends(get_db)) -> list[DatasetClassItem]:
    try:
        return get_dataset_classes(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/classes", response_model=list[DatasetClassItem])
def create_dataset_class(dataset_id: int, payload: DatasetClassCreate, db: Session = Depends(get_db)) -> list[DatasetClassItem]:
    try:
        return add_dataset_class(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/classes/import", response_model=list[DatasetClassItem])
def import_dataset_class_list(dataset_id: int, payload: DatasetClassesImport, db: Session = Depends(get_db)) -> list[DatasetClassItem]:
    try:
        return import_dataset_classes(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/splits", response_model=list[DatasetSplitItem])
def read_dataset_splits(dataset_id: int, db: Session = Depends(get_db)) -> list[DatasetSplitItem]:
    try:
        return list_dataset_splits(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/splits", response_model=list[DatasetSplitItem])
def create_dataset_split(dataset_id: int, payload: DatasetSplitCreate, db: Session = Depends(get_db)) -> list[DatasetSplitItem]:
    try:
        return add_dataset_split(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/events", response_model=list[DatasetEventItem])
def read_dataset_events(dataset_id: int, db: Session = Depends(get_db)) -> list[DatasetEventItem]:
    try:
        return list_dataset_events(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/sources", response_model=list[DatasetSourceItem])
def read_dataset_sources(dataset_id: int, db: Session = Depends(get_db)) -> list[DatasetSourceItem]:
    try:
        return list_dataset_sources(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/sources", response_model=DatasetSourceAddSummary)
def create_dataset_source(dataset_id: int, payload: DatasetSourceCreate, db: Session = Depends(get_db)) -> DatasetSourceAddSummary:
    try:
        return add_dataset_source(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/sources/video-plan", response_model=DatasetVideoPlanSummary)
def preview_dataset_source_video_plan(
    dataset_id: int,
    payload: DatasetVideoPlanRequest,
    db: Session = Depends(get_db),
) -> DatasetVideoPlanSummary:
    try:
        return preview_dataset_video_plan(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/sources/{source_id}/extract-frames", response_model=DatasetFrameExtractionSummary)
def extract_dataset_source_video_frames(
    dataset_id: int,
    source_id: int,
    payload: DatasetFrameExtractionRequest,
    db: Session = Depends(get_db),
) -> DatasetFrameExtractionSummary:
    try:
        return extract_dataset_source_frames(db, dataset_id, source_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/versions", response_model=DatasetItem)
def create_next_dataset_version(dataset_id: int, payload: DatasetVersionCreate, db: Session = Depends(get_db)) -> DatasetItem:
    try:
        return create_dataset_version(db, dataset_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/datasets/{dataset_id}/versions", response_model=list[DatasetVersionSummary])
def read_dataset_versions(dataset_id: int, db: Session = Depends(get_db)) -> list[DatasetVersionSummary]:
    try:
        return list_dataset_versions(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/versions/rebuild-manifest", response_model=DatasetVersionSummary)
def refresh_dataset_version_manifest(dataset_id: int, db: Session = Depends(get_db)) -> DatasetVersionSummary:
    try:
        return rebuild_dataset_version_manifest(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/versions/export-yolo", response_model=DatasetExportSummary)
def export_dataset_version_as_yolo(dataset_id: int, db: Session = Depends(get_db)) -> DatasetExportSummary:
    try:
        return export_dataset_version_yolo(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/assets", response_model=DatasetUploadSummary)
def upload_dataset_files(
    dataset_id: int,
    files: list[UploadFile] = File(...),
    extract_video_frames: bool = Form(False),
    frame_interval: int = Form(30),
    split_policy: str = Form("Auto"),
    db: Session = Depends(get_db),
) -> DatasetUploadSummary:
    try:
        return upload_dataset_assets(
            db,
            dataset_id,
            files=files,
            extract_video_frames=extract_video_frames,
            frame_interval=frame_interval,
            split_policy=split_policy,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/datasets/{dataset_id}/open-folder")
def open_dataset_source_folder(dataset_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        return open_dataset_folder(db, dataset_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/files/preview")
def read_file_preview(path: str) -> FileResponse:
    file_path = Path(path).expanduser().resolve()
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Preview file not found")
    if file_path.suffix.lower() not in IMAGE_SUFFIXES and file_path.suffix.lower() not in VIDEO_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported preview file")
    return FileResponse(file_path)
