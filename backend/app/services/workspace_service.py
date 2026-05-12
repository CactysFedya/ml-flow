from __future__ import annotations

import os
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from re import sub
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import BACKEND_ROOT, DATA_DIR
from app.models.workspace import DatasetEventRecord, DatasetRecord, DatasetSourceRecord, ProjectRecord
from app.schemas.workspace import (
    DatasetAnnotationItem,
    DatasetAnnotationPayload,
    DatasetAnnotationShape,
    DatasetClassCreate,
    DatasetCreate,
    DatasetClassItem,
    DatasetClassesImport,
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
    DatasetSplits,
    DatasetStats,
    DatasetTagCatalogItem,
    DatasetTagCatalogPayload,
    DatasetUpdate,
    DatasetUploadSummary,
    DatasetVideoPlanItem,
    DatasetVideoPlanRequest,
    DatasetVideoPlanSummary,
    DatasetVersionCreate,
    DatasetVersionSampleItem,
    DatasetVersionSummary,
    ProjectActivityItem,
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from app.services.dataset_scanner import (
    ANNOTATION_SUFFIXES,
    CLASS_NAME_FILES,
    IMAGE_SUFFIXES,
    MediaItemResult,
    ScanResult,
    VIDEO_SUFFIXES,
    list_dataset_classes,
    list_dataset_media,
    list_dataset_media_paths,
    scan_dataset_path,
)

SPLIT_COLORS = {
    "Train": "#2F6DF6",
    "Validation": "#8B5CF6",
    "Val": "#8B5CF6",
    "Test": "#10B981",
}
SPLIT_DESCRIPTIONS = {
    "Train": "Training set used to fit the model.",
    "Validation": "Validation set used to tune and compare models.",
    "Test": "Holdout set used for final evaluation.",
}
TARGET_SPLIT_RATIO = {"Train": 0.8, "Val": 0.1, "Test": 0.1}
INTERNAL_DATASETS_DIR = DATA_DIR / "dataset_workspaces"
DEFAULT_PROJECT_NAME = "Vision Project"
LEGACY_DATASET_NAME = "Drone Vision"
LEGACY_DATASET_VERSION = "v1.0"
IGNORED_SYSTEM_FILENAMES = {".ds_store", "thumbs.db"}
MEDIA_MANIFEST_FILENAME = "media_manifest.mlfmeta"
WORKSPACE_STATE_DIRNAME = ".mlforge"
MEDIA_METADATA_EXTENSION = ".mlfmeta"
TAG_CATALOG_FILENAME = "tag_catalog.mlfmeta"


def ensure_seed_data(db: Session) -> None:
    if db.info.get("_workspace_seed_checked"):
        return
    db.info["_workspace_seed_checked"] = True

    changed = False
    project = db.scalar(select(ProjectRecord).order_by(ProjectRecord.id.asc()))
    if project is not None and not project.storage_path:
        project.storage_path = str(INTERNAL_DATASETS_DIR / f"project_{project.id}")
        Path(project.storage_path).mkdir(parents=True, exist_ok=True)
        changed = True

    dataset_count = db.scalar(select(func.count(DatasetRecord.id))) or 0
    if dataset_count == 0 and _has_bootstrap_source():
        if project is None:
            project = _create_default_project_record(db)
            changed = True
        changed = _bootstrap_dataset_registry(db, project) or changed

    if changed:
        db.commit()


def _create_default_project_record(db: Session) -> ProjectRecord:
    project = ProjectRecord(
        name=DEFAULT_PROJECT_NAME,
        description="Primary workspace project for dataset management and labeling.",
        task="Object Detection",
        storage_path="",
    )
    db.add(project)
    db.flush()
    project_root = INTERNAL_DATASETS_DIR / f"project_{project.id}"
    project_root.mkdir(parents=True, exist_ok=True)
    project.storage_path = str(project_root)
    return project


def _has_bootstrap_source() -> bool:
    return any(path.exists() and path.is_dir() and _directory_has_media(path) for path in _legacy_dataset_candidates())


def _bootstrap_dataset_registry(db: Session, project: ProjectRecord) -> bool:
    changed = False
    for source_root in _legacy_dataset_candidates():
        if not source_root.exists() or not source_root.is_dir():
            continue
        if not _directory_has_media(source_root):
            continue
        changed = _bootstrap_dataset_record(
            db,
            project=project,
            source_root=source_root,
            name=LEGACY_DATASET_NAME,
            version=LEGACY_DATASET_VERSION,
            topic="Drone Vision",
            task="Object Detection",
            format="YOLO",
        ) or changed
        break
    return changed


def _bootstrap_dataset_record(
    db: Session,
    *,
    project: ProjectRecord,
    source_root: Path,
    name: str,
    version: str,
    topic: str,
    task: str,
    format: str,
) -> bool:
    source_root = source_root.expanduser().resolve()
    workspace_root = _default_dataset_workspace_path(project.id, name, version)
    workspace_root.mkdir(parents=True, exist_ok=True)
    if not _has_annotation_workspace(workspace_root):
        _copy_annotation_workspace(source_root, workspace_root)

    record = db.scalar(_dataset_version_record_query(project.id, name, version))
    changed = False
    if record is None:
        record = DatasetRecord(
            project_id=project.id,
            name=name,
            version=_normalize_version_label(version),
            topic=topic,
            task=task,
            status="Ready",
            format=format,
            source_path=str(source_root),
            storage_path=str(workspace_root),
        )
        db.add(record)
        db.flush()
        changed = True
    else:
        if record.source_path != str(source_root):
            record.source_path = str(source_root)
            changed = True
        if record.storage_path != str(workspace_root):
            record.storage_path = str(workspace_root)
            changed = True

    _apply_scan_to_record(record, _scan_dataset_record(record))

    source_count = db.scalar(select(func.count(DatasetSourceRecord.id)).where(DatasetSourceRecord.dataset_id == record.id)) or 0
    if source_count == 0:
        _add_dataset_source_record(
            db,
            record,
            name="Recovered Workspace Storage",
            source_type="workspace",
            source_path=str(source_root),
            target_path=str(source_root),
            split_policy="Existing folders",
            image_count=record.image_count,
            video_count=record.video_count,
            annotation_count=record.annotation_count,
            class_count=record.class_count,
            train_count=record.train_count,
            val_count=record.val_count,
            test_count=record.test_count,
            notes="Recovered from existing dataset files on disk.",
        )
        changed = True

    event_count = db.scalar(select(func.count(DatasetEventRecord.id)).where(DatasetEventRecord.dataset_id == record.id)) or 0
    if event_count == 0:
        _add_dataset_event(db, record.id, "import", "Dataset registered", "Recovered dataset registry entry from existing files on disk.")
        changed = True

    return changed


def _legacy_dataset_candidates() -> list[Path]:
    return [
        BACKEND_ROOT / r"E:\MLForge\data\datasets",
        DATA_DIR / "datasets",
    ]


def _directory_has_media(root: Path) -> bool:
    if not root.exists() or not root.is_dir():
        return False
    for path in root.rglob("*"):
        if not path.is_file() or _is_ignored_path(path):
            continue
        if path.suffix.lower() in IMAGE_SUFFIXES or path.suffix.lower() in VIDEO_SUFFIXES:
            return True
    return False


def _open_local_folder(folder: Path) -> dict[str, str]:
    try:
        if os.name == "nt":
            os.startfile(str(folder))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", str(folder)], check=True)
        else:
            subprocess.run(["xdg-open", str(folder)], check=True)
    except (OSError, subprocess.SubprocessError) as exc:
        raise ValueError(f"Could not open folder: {folder}") from exc
    return {"status": "opened", "path": str(folder)}


def list_projects(db: Session) -> list[ProjectSummary]:
    ensure_seed_data(db)
    records = db.scalars(select(ProjectRecord).order_by(ProjectRecord.updated_at.desc())).all()
    return [_project_summary(db, record) for record in records]


def get_project(db: Session, project_id: int) -> ProjectDetail:
    ensure_seed_data(db)
    record = db.get(ProjectRecord, project_id)
    if record is None:
        raise LookupError("Project not found")
    datasets = db.scalars(select(DatasetRecord).where(DatasetRecord.project_id == project_id).order_by(DatasetRecord.updated_at.desc())).all()
    return ProjectDetail(
        **_project_summary(db, record).model_dump(),
        datasets=[_dataset_item(item) for item in datasets],
        activities=_project_activities(db, datasets),
    )


def create_project(db: Session, payload: ProjectCreate) -> ProjectDetail:
    requested_storage = payload.storage_path.strip() if payload.storage_path else ""
    record = ProjectRecord(
        name=payload.name,
        description=payload.description,
        task=payload.task,
        storage_path="",
    )
    db.add(record)
    db.flush()
    storage_root = Path(requested_storage).expanduser().resolve() if requested_storage else INTERNAL_DATASETS_DIR / f"project_{record.id}"
    storage_root.mkdir(parents=True, exist_ok=True)
    record.storage_path = str(storage_root)
    db.commit()
    db.refresh(record)
    return get_project(db, record.id)


def update_project(db: Session, project_id: int, payload: ProjectUpdate) -> ProjectDetail:
    ensure_seed_data(db)
    record = db.get(ProjectRecord, project_id)
    if record is None:
        raise LookupError("Project not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "storage_path" in update_data and update_data["storage_path"]:
        update_data["storage_path"] = str(Path(update_data["storage_path"]).expanduser().resolve())
    for field, value in update_data.items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return get_project(db, record.id)


def delete_project(db: Session, project_id: int) -> None:
    ensure_seed_data(db)
    record = db.get(ProjectRecord, project_id)
    if record is None:
        raise LookupError("Project not found")
    dataset_ids = [dataset.id for dataset in db.scalars(select(DatasetRecord).where(DatasetRecord.project_id == project_id)).all()]
    project_root = Path(record.storage_path).expanduser().resolve() if record.storage_path else None
    for dataset_id in dataset_ids:
        delete_dataset(db, dataset_id)
    if project_root and project_root.exists() and project_root.is_dir():
        shutil.rmtree(project_root, ignore_errors=True)
    db.delete(record)
    db.commit()


def open_project_folder(db: Session, project_id: int) -> dict[str, str]:
    ensure_seed_data(db)
    record = db.get(ProjectRecord, project_id)
    if record is None:
        raise LookupError("Project not found")
    folder = Path(record.storage_path).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        raise ValueError(f"Project folder does not exist: {folder}")
    return _open_local_folder(folder)


def list_datasets(db: Session) -> list[DatasetItem]:
    ensure_seed_data(db)
    records = db.scalars(select(DatasetRecord).order_by(DatasetRecord.updated_at.desc())).all()
    return [_dataset_item(record) for record in records]


def get_dataset(db: Session, dataset_id: int) -> DatasetItem:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")
    return _dataset_item(record)


def get_dataset_media(
    db: Session,
    dataset_id: int,
    *,
    annotated: str | None = None,
    kind: str | None = None,
    limit: int = 500,
    search: str | None = None,
    split: str | None = None,
    verified: str | None = None,
) -> list[DatasetMediaItem]:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")

    media = _dataset_media_items(record, limit=limit)
    media = _filter_media(media, annotated=annotated, kind=kind, search=search, split=split, verified=verified)

    return [
        DatasetMediaItem(
            id=item.id,
            name=item.name,
            path=item.path,
            kind=item.kind,
            split=item.split,
            annotated=item.annotated,
            verified=item.verified,
            tags=_read_media_metadata(record, Path(item.path).expanduser().resolve())["tags"],
            preview_url=_preview_url(item.path),
            width=item.width,
            height=item.height,
        )
        for item in media
    ]


def get_dataset_annotation(db: Session, dataset_id: int, path: str) -> DatasetAnnotationItem:
    record = _require_dataset(db, dataset_id)
    media_path = _validate_media_path(record, path)
    annotation_path = _annotation_file_for_media(record, media_path)
    metadata = _read_media_metadata(record, media_path)
    return DatasetAnnotationItem(
        path=str(media_path),
        label_path=str(annotation_path) if annotation_path and annotation_path.exists() else None,
        format="YOLO",
        annotations=_read_annotation_file(annotation_path) if annotation_path and annotation_path.exists() else [],
        verified=bool(metadata["verified"]),
        tags=[str(item) for item in metadata["tags"]],
    )


def save_dataset_annotation(db: Session, dataset_id: int, payload: DatasetAnnotationPayload) -> DatasetAnnotationItem:
    record = _require_dataset(db, dataset_id)
    media_path = _validate_media_path(record, payload.path)
    shared_root = _dataset_shared_annotation_root(record, ensure=True)
    label_path = _normalized_annotation_path(shared_root, media_path)
    legacy_label_path = _normalized_annotation_path(_dataset_annotation_root(record, ensure=True), media_path)

    if payload.annotations:
        label_path.parent.mkdir(parents=True, exist_ok=True)
        label_path.write_text(_annotation_text(payload.annotations), encoding="utf-8")
        if legacy_label_path != label_path and legacy_label_path.exists():
            try:
                legacy_label_path.unlink()
            except OSError:
                pass
        event_title = "Annotation saved"
        event_description = f"Updated annotation for {media_path.name}."
    else:
        if label_path.exists():
            label_path.unlink()
        if legacy_label_path != label_path and legacy_label_path.exists():
            try:
                legacy_label_path.unlink()
            except OSError:
                pass
        event_title = "Annotation cleared"
        event_description = f"Removed annotation for {media_path.name}."

    _write_media_metadata(record, media_path, verified=payload.verified, tags=payload.tags)

    _touch_scan_counts(record)
    _add_dataset_event(db, record.id, "annotation", event_title, event_description)
    db.commit()
    db.refresh(record)
    return get_dataset_annotation(db, dataset_id, str(media_path))


def get_dataset_tag_catalog(db: Session, dataset_id: int) -> DatasetTagCatalogItem:
    record = _require_dataset(db, dataset_id)
    return DatasetTagCatalogItem(tags=_read_tag_catalog(record))


def update_dataset_tag_catalog(db: Session, dataset_id: int, payload: DatasetTagCatalogPayload) -> DatasetTagCatalogItem:
    record = _require_dataset(db, dataset_id)
    tags = _write_tag_catalog(record, payload.tags)
    _add_dataset_event(db, record.id, "settings", "Tag catalog updated", f"Saved {len(tags)} dataset tags.")
    db.commit()
    db.refresh(record)
    return DatasetTagCatalogItem(tags=tags)


def get_dataset_classes(db: Session, dataset_id: int) -> list[DatasetClassItem]:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")

    return [
        DatasetClassItem(id=item.id, name=item.name, instances=item.instances, color=item.color)
        for item in list_dataset_classes(str(_dataset_class_index_root(record)))
    ]


def add_dataset_class(db: Session, dataset_id: int, payload: DatasetClassCreate) -> list[DatasetClassItem]:
    record = _require_dataset(db, dataset_id)
    classes_root = _dataset_classes_root(record, ensure=True)
    class_names = _read_dataset_class_names(record)
    name = payload.name.strip()
    if not name:
        raise ValueError("Class name is required")
    if name.lower() not in {item.lower() for item in class_names}:
        class_names.append(name)
        _write_class_names(str(classes_root), class_names)
        _touch_scan_counts(record)
        _add_dataset_event(db, record.id, "class", "Class added", f"Added class: {name}")
    db.commit()
    db.refresh(record)
    return get_dataset_classes(db, dataset_id)


def import_dataset_classes(db: Session, dataset_id: int, payload: DatasetClassesImport) -> list[DatasetClassItem]:
    record = _require_dataset(db, dataset_id)
    incoming = _dedupe_class_names(payload.classes)
    if not incoming:
        raise ValueError("Class list is empty")

    mode = payload.mode.lower()
    if mode not in {"append", "replace"}:
        raise ValueError("Class import mode must be append or replace")

    classes_root = _dataset_classes_root(record, ensure=True)
    current = [] if mode == "replace" else _read_dataset_class_names(record)
    known = {item.lower() for item in current}
    added = [item for item in incoming if item.lower() not in known]
    _write_class_names(str(classes_root), current + added)
    _touch_scan_counts(record)
    _add_dataset_event(
        db,
        record.id,
        "class",
        "Classes imported",
        f"{'Replaced' if mode == 'replace' else 'Added'} {len(added if mode == 'append' else incoming)} classes.",
    )
    db.commit()
    db.refresh(record)
    return get_dataset_classes(db, dataset_id)


def list_dataset_splits(db: Session, dataset_id: int) -> list[DatasetSplitItem]:
    record = _require_dataset(db, dataset_id)
    counts: dict[str, dict[str, int]] = {}
    for item in _dataset_media_items(record, limit=20_000):
        bucket = "Validation" if item.split == "Val" else item.split
        counts.setdefault(bucket, {"images": 0, "videos": 0})
        counts[bucket]["videos" if item.kind == "video" else "images"] += 1

    for label, count in (("Train", record.train_count), ("Validation", record.val_count), ("Test", record.test_count)):
        counts.setdefault(label, {"images": 0, "videos": 0})
        counts[label]["images"] = max(counts[label]["images"], count)

    total = sum(value["images"] + value["videos"] for value in counts.values())
    ordered_names = ["Train", "Validation", "Test"] + sorted(name for name in counts if name not in {"Train", "Validation", "Test"})
    return [
        DatasetSplitItem(
            name=name,
            images=counts[name]["images"],
            videos=counts[name]["videos"],
            total=counts[name]["images"] + counts[name]["videos"],
            percent=round(((counts[name]["images"] + counts[name]["videos"]) / total) * 100, 1) if total else 0.0,
            description=SPLIT_DESCRIPTIONS.get(name, "Custom dataset split."),
            color=SPLIT_COLORS.get(name, "#64748B"),
            system=name in {"Train", "Validation", "Test"},
        )
        for name in ordered_names
        if name in counts
    ]


def add_dataset_split(db: Session, dataset_id: int, payload: DatasetSplitCreate) -> list[DatasetSplitItem]:
    record = _require_dataset(db, dataset_id)
    name = _clean_split_name(payload.name)
    if not name:
        raise ValueError("Split name is required")
    media_root = _require_dataset_folder(record)
    slug = _split_folder_name(name)
    (media_root / "images" / slug).mkdir(parents=True, exist_ok=True)
    (media_root / "videos" / slug).mkdir(parents=True, exist_ok=True)
    (_dataset_shared_annotation_root(record, ensure=True) / "labels" / slug).mkdir(parents=True, exist_ok=True)
    _add_dataset_event(db, record.id, "split", "Split added", payload.description or f"Added split: {name}")
    db.commit()
    return list_dataset_splits(db, dataset_id)


def list_dataset_events(db: Session, dataset_id: int) -> list[DatasetEventItem]:
    _require_dataset(db, dataset_id)
    records = db.scalars(
        select(DatasetEventRecord)
        .where(DatasetEventRecord.dataset_id == dataset_id)
        .order_by(DatasetEventRecord.created_at.desc(), DatasetEventRecord.id.desc())
    ).all()
    return [_event_item(record) for record in records]


def list_dataset_sources(db: Session, dataset_id: int) -> list[DatasetSourceItem]:
    record = _require_dataset(db, dataset_id)
    _ensure_primary_source_record(db, record)
    records = db.scalars(
        select(DatasetSourceRecord)
        .where(DatasetSourceRecord.dataset_id == dataset_id)
        .order_by(DatasetSourceRecord.created_at.desc(), DatasetSourceRecord.id.desc())
    ).all()
    return [_source_item(item) for item in records]


def add_dataset_source(db: Session, dataset_id: int, payload: DatasetSourceCreate) -> DatasetSourceAddSummary:
    record = _require_dataset(db, dataset_id)
    source = Path(payload.source_path).expanduser().resolve()
    if not source.exists() or not source.is_dir():
        raise ValueError(f"Source folder does not exist: {source}")

    warnings: list[str] = []
    try:
        source_scan = scan_dataset_path(str(source))
    except ValueError as exc:
        raise ValueError(str(exc)) from exc

    media_root = _require_dataset_folder(record)
    shared_annotation_root = _dataset_shared_annotation_root(record, ensure=True)
    copied_counts: dict[str, int] | None = None
    frames_saved = 0
    added_media_paths: list[Path] = []
    if payload.copy_assets:
        copied_counts, frames_saved, copy_warnings, added_media_paths = _copy_source_assets(
            record,
            source,
            media_root,
            shared_annotation_root,
            payload.split_policy,
            payload.extract_video_frames,
            payload.frame_interval,
        )
        warnings.extend(copy_warnings)
        _append_dataset_media_paths(record, added_media_paths)
        _apply_scan_to_record(record, _scan_dataset_record(record))
    else:
        copied_counts = {
            "images": source_scan.image_count,
            "videos": source_scan.video_count,
            "annotations": source_scan.annotation_count,
            "classes": source_scan.class_count,
            "train": source_scan.train_count,
            "val": source_scan.val_count,
            "test": source_scan.test_count,
        }
        added_media_paths = _collect_media_files(source)
        _append_dataset_media_paths(record, added_media_paths)
        _apply_scan_to_record(record, _scan_dataset_record(record))

    source_record = DatasetSourceRecord(
        dataset_id=record.id,
        name=(payload.name or source.name or "Source").strip(),
        source_type=payload.source_type or "folder",
        source_path=str(source),
        target_path=str(media_root) if payload.copy_assets else "",
        status="Ready",
        split_policy=payload.split_policy,
        image_count=copied_counts["images"],
        video_count=copied_counts["videos"],
        annotation_count=copied_counts["annotations"],
        class_count=copied_counts["classes"],
        frame_count=frames_saved,
        train_count=copied_counts["train"],
        val_count=copied_counts["val"],
        test_count=copied_counts["test"],
        notes=payload.notes or ("Copied into dataset media storage." if payload.copy_assets else "Source registered as external."),
    )
    db.add(source_record)
    _add_dataset_event(
        db,
        record.id,
        "source",
        "Source added",
        f"{source_record.name}: {source_scan.image_count} images, {source_scan.video_count} videos, {source_scan.annotation_count} annotations.",
    )
    db.commit()
    db.refresh(record)
    db.refresh(source_record)
    return DatasetSourceAddSummary(
        dataset=_dataset_item(record),
        source=_source_item(source_record),
        sources=list_dataset_sources(db, dataset_id),
        warnings=warnings,
    )


def preview_dataset_video_plan(db: Session, dataset_id: int, payload: DatasetVideoPlanRequest) -> DatasetVideoPlanSummary:
    record = _require_dataset(db, dataset_id)
    source = Path(payload.source_path).expanduser().resolve()
    if not source.exists() or not source.is_dir():
        raise ValueError(f"Source folder does not exist: {source}")

    pending_split_counts = {"Train": 0, "Val": 0, "Test": 0}
    warnings: list[str] = []
    items: list[DatasetVideoPlanItem] = []
    for path in sorted(source.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in VIDEO_SUFFIXES:
            continue
        split = _source_file_split(record, path, source, payload.split_policy, pending_split_counts)
        pending_split_counts[split] = pending_split_counts.get(split, 0) + 1
        probe = _probe_video(path)
        estimated_frames = _estimated_frame_count(probe.get("total_frames"), probe.get("duration_seconds"), probe.get("fps"), payload.frame_interval)
        warning = ""
        if not probe:
            warning = "ffprobe is not available or could not read this file"
            if warning not in warnings:
                warnings.append(warning)
        items.append(
            DatasetVideoPlanItem(
                name=path.name,
                path=str(path),
                size_bytes=path.stat().st_size,
                split=split,
                duration_seconds=probe.get("duration_seconds"),
                fps=probe.get("fps"),
                total_frames=probe.get("total_frames"),
                estimated_frames=estimated_frames,
                warning=warning,
            )
        )

    known_durations = [item.duration_seconds for item in items if item.duration_seconds is not None]
    return DatasetVideoPlanSummary(
        source_path=str(source),
        video_count=len(items),
        total_size_bytes=sum(item.size_bytes for item in items),
        total_duration_seconds=sum(known_durations) if known_durations else None,
        estimated_frames=sum(item.estimated_frames for item in items),
        frame_interval=payload.frame_interval,
        split_policy=payload.split_policy,
        items=items,
        warnings=warnings,
    )


def extract_dataset_source_frames(
    db: Session,
    dataset_id: int,
    source_id: int,
    payload: DatasetFrameExtractionRequest,
) -> DatasetFrameExtractionSummary:
    record = _require_dataset(db, dataset_id)
    source_record = db.get(DatasetSourceRecord, source_id)
    if source_record is None or source_record.dataset_id != dataset_id:
        raise LookupError("Source batch not found")

    root = _require_dataset_folder(record)
    warnings: list[str] = []
    frames_saved = 0
    extracted_paths: list[Path] = []
    video_files = _source_video_files(record, source_record)
    if not video_files:
        warnings.append("No videos found for this source batch.")

    for video_path in video_files:
        split = _split_from_path(video_path)
        saved_paths = _extract_video_frames(video_path, root / "images" / _split_folder_name(split), payload.frame_interval)
        if saved_paths is None:
            warnings.append(f"Could not extract {video_path.name}; install opencv-python-headless or add ffmpeg to PATH.")
            continue
        frames_saved += len(saved_paths)
        extracted_paths.extend(saved_paths)

    source_record.frame_count += frames_saved
    source_record.updated_at = datetime.now(timezone.utc)
    if extracted_paths:
        _append_dataset_media_paths(record, extracted_paths)
    _apply_scan_to_record(record, _scan_dataset_record(record))
    _add_dataset_event(
        db,
        record.id,
        "media",
        "Frames extracted",
        f"Extracted {frames_saved} frames from source {source_record.name}.",
    )
    db.commit()
    db.refresh(record)
    db.refresh(source_record)
    return DatasetFrameExtractionSummary(
        dataset=_dataset_item(record),
        source=_source_item(source_record),
        sources=list_dataset_sources(db, dataset_id),
        frames_saved=frames_saved,
        warnings=warnings,
    )


def create_dataset_version(db: Session, dataset_id: int, payload: DatasetVersionCreate) -> DatasetItem:
    source_record = _require_dataset(db, dataset_id)
    next_version = _next_available_version_label(db, source_record, payload.version)
    asset_root = _dataset_media_root(source_record, ensure=True)
    version_root = _dataset_family_root_from_record(source_record) / "versions" / _normalize_version_label(next_version)
    version_root.mkdir(parents=True, exist_ok=True)

    record = DatasetRecord(
        project_id=source_record.project_id,
        name=source_record.name,
        version=next_version,
        topic=source_record.topic,
        task=source_record.task,
        status="Draft",
        format=source_record.format,
        source_path=str(asset_root),
        storage_path=str(version_root),
        image_count=source_record.image_count,
        video_count=source_record.video_count,
        annotation_count=source_record.annotation_count,
        class_count=source_record.class_count,
        train_count=source_record.train_count,
        val_count=source_record.val_count,
        test_count=source_record.test_count,
        labeled_count=source_record.labeled_count,
        verified_count=source_record.verified_count,
    )
    db.add(record)
    db.flush()
    _write_media_manifest(record, _dataset_media_paths(source_record))
    _apply_scan_to_record(record, _scan_dataset_record(record))
    cloned_sources = _clone_dataset_source_records(db, source_record, record, _dataset_annotation_root(source_record, ensure=True), version_root)
    if not cloned_sources:
        _add_dataset_source_record(
            db,
            record,
            name=f"Version from {source_record.version}",
            source_type="version",
            source_path=source_record.source_path,
            target_path=str(asset_root),
            split_policy="Snapshot manifest",
            image_count=record.image_count,
            video_count=record.video_count,
            annotation_count=record.annotation_count,
            class_count=record.class_count,
            train_count=record.train_count,
            val_count=record.val_count,
            test_count=record.test_count,
            notes=payload.description or f"Created version {next_version} as a media snapshot from {source_record.version}.",
        )
    _add_dataset_event(
        db,
        record.id,
        "version",
        "Version created",
        payload.description or f"Created version {next_version} with a separate annotation layer and a frozen media snapshot.",
    )
    _add_dataset_event(db, source_record.id, "version", "New version opened", f"Version {next_version} was created as a snapshot for this dataset.")
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def list_dataset_versions(db: Session, dataset_id: int) -> list[DatasetVersionSummary]:
    record = _require_dataset(db, dataset_id)
    version_records = db.scalars(
        select(DatasetRecord)
        .where(
            DatasetRecord.project_id == record.project_id,
            func.lower(DatasetRecord.name) == record.name.lower(),
        )
        .order_by(DatasetRecord.updated_at.desc(), DatasetRecord.id.desc())
    ).all()
    return [_dataset_version_summary(db, item) for item in version_records]


def rebuild_dataset_version_manifest(db: Session, dataset_id: int) -> DatasetVersionSummary:
    record = _require_dataset(db, dataset_id)
    manifest_exists = _media_manifest_path(record).exists()
    before_count = len(_read_media_manifest_payload(record) or []) if manifest_exists else 0
    tracked_paths = _repair_dataset_media_manifest(record)
    _apply_scan_to_record(record, _scan_dataset_record(record))
    action = "rebuilt" if manifest_exists else "created"
    _add_dataset_event(
        db,
        record.id,
        "version",
        "Manifest refreshed",
        f"Media manifest was {action} and now tracks {len(tracked_paths)} files (was {before_count}).",
    )
    db.commit()
    db.refresh(record)
    return _dataset_version_summary(db, record)


def export_dataset_version_yolo(db: Session, dataset_id: int) -> DatasetExportSummary:
    record = _require_dataset(db, dataset_id)
    export_root = _dataset_family_root_from_record(record) / "exports" / "yolo" / _normalize_version_label(record.version)
    if export_root.exists():
        shutil.rmtree(export_root, ignore_errors=True)
    export_root.mkdir(parents=True, exist_ok=True)

    for relative in ("images/train", "images/val", "images/test", "labels/train", "labels/val", "labels/test"):
        (export_root / relative).mkdir(parents=True, exist_ok=True)

    class_names = _read_dataset_class_names(record)
    classes_path = export_root / "classes.txt"
    _write_class_names(str(export_root), class_names)

    images_exported = 0
    labels_exported = 0
    skipped_videos = 0

    for media_path in _dataset_media_paths(record):
        if media_path.suffix.lower() in VIDEO_SUFFIXES:
            skipped_videos += 1
            continue
        if media_path.suffix.lower() not in IMAGE_SUFFIXES:
            continue

        split_name = _split_folder_name(_split_from_path(media_path))
        image_destination = _unique_path(export_root / "images" / split_name / media_path.name)
        _link_or_copy_file(media_path, image_destination)
        images_exported += 1

        label_destination = export_root / "labels" / split_name / f"{image_destination.stem}.txt"
        annotation_path = _annotation_file_for_media(record, media_path)
        if annotation_path and annotation_path.exists() and annotation_path.suffix.lower() == ".txt":
            shutil.copy2(annotation_path, label_destination)
        else:
            label_destination.write_text("", encoding="utf-8")
        labels_exported += 1

    data_yaml_path = export_root / "data.yaml"
    data_yaml_path.write_text(_yolo_data_yaml(class_names), encoding="utf-8")

    _add_dataset_event(
        db,
        record.id,
        "export",
        "YOLO export created",
        f"Exported {images_exported} images and {labels_exported} label files to {export_root}. Skipped {skipped_videos} videos.",
    )
    db.commit()
    db.refresh(record)
    return DatasetExportSummary(
        dataset_id=record.id,
        version=record.version,
        export_format="YOLO",
        export_path=str(export_root),
        images_exported=images_exported,
        labels_exported=labels_exported,
        skipped_videos=skipped_videos,
        classes=len(class_names),
        data_yaml_path=str(data_yaml_path),
        classes_path=str(classes_path),
    )


def upload_dataset_assets(
    db: Session,
    dataset_id: int,
    *,
    files: list,
    extract_video_frames: bool,
    frame_interval: int,
    split_policy: str,
) -> DatasetUploadSummary:
    record = _require_dataset(db, dataset_id)
    root = _require_dataset_folder(record)
    warnings: list[str] = []
    assigned_splits: list[str] = []
    pending_split_counts = {"Train": 0, "Val": 0, "Test": 0}
    images_saved = 0
    videos_saved = 0
    frames_saved = 0
    added_media_paths: list[Path] = []

    for upload in files:
        filename = Path(upload.filename or "asset").name
        suffix = Path(filename).suffix.lower()
        if suffix not in IMAGE_SUFFIXES and suffix not in VIDEO_SUFFIXES:
            warnings.append(f"Skipped unsupported file: {filename}")
            continue

        split = _choose_upload_split(record, split_policy, pending_split_counts)
        assigned_splits.append(split)
        folder_kind = "videos" if suffix in VIDEO_SUFFIXES else "images"
        destination = _unique_path(root / folder_kind / _split_folder_name(split) / filename)
        destination.parent.mkdir(parents=True, exist_ok=True)

        with destination.open("wb") as target:
            shutil.copyfileobj(upload.file, target)
        added_media_paths.append(destination.resolve())

        if suffix in IMAGE_SUFFIXES:
            images_saved += 1
            pending_split_counts[split] = pending_split_counts.get(split, 0) + 1
            continue

        videos_saved += 1
        pending_split_counts[split] = pending_split_counts.get(split, 0) + 1
        if extract_video_frames:
            extracted_paths = _extract_video_frames(destination, root / "images" / _split_folder_name(split), frame_interval)
            if extracted_paths is None:
                warnings.append(f"Saved {filename}, but frame extraction needs opencv-python-headless or ffmpeg in PATH.")
            else:
                frames_saved += len(extracted_paths)
                added_media_paths.extend(extracted_paths)

    _append_dataset_media_paths(record, added_media_paths)
    _apply_scan_to_record(record, _scan_dataset_record(record))
    _add_dataset_source_record(
        db,
        record,
        name=f"Upload {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        source_type="upload",
        source_path="browser upload",
        target_path=str(root),
        split_policy=split_policy,
        image_count=images_saved,
        video_count=videos_saved,
        annotation_count=0,
        class_count=0,
        frame_count=frames_saved,
        train_count=pending_split_counts.get("Train", 0),
        val_count=pending_split_counts.get("Val", 0),
        test_count=pending_split_counts.get("Test", 0),
        notes=f"Assigned splits: {', '.join(sorted(set(assigned_splits))) or 'none'}.",
    )
    _add_dataset_event(
        db,
        record.id,
        "media",
        "Media uploaded",
        f"Saved {images_saved} images, {videos_saved} videos, and {frames_saved} extracted frames.",
    )
    db.commit()
    db.refresh(record)
    return DatasetUploadSummary(
        dataset=_dataset_item(record),
        files_saved=images_saved + videos_saved,
        images_saved=images_saved,
        videos_saved=videos_saved,
        frames_saved=frames_saved,
        assigned_splits=sorted(set(assigned_splits)),
        warnings=warnings,
    )


def create_dataset(db: Session, payload: DatasetCreate) -> DatasetItem:
    version = _normalize_version_label(payload.version)
    _ensure_dataset_version_available(db, payload.project_id, payload.name, version)
    family_root = _dataset_family_root_for_project(db, payload.project_id, payload.name)
    source = Path(payload.source_path).expanduser().resolve() if payload.source_path else family_root / "assets"
    workspace = family_root / "versions" / version
    source.mkdir(parents=True, exist_ok=True)
    workspace.mkdir(parents=True, exist_ok=True)

    record = DatasetRecord(
        project_id=payload.project_id,
        name=payload.name,
        version=version,
        topic=payload.topic,
        task=payload.task,
        format=payload.format,
        source_path=str(source),
        storage_path=str(workspace),
    )
    db.add(record)
    db.flush()
    _snapshot_dataset_media(record)
    _add_dataset_source_record(
        db,
        record,
        name="Workspace Storage",
        source_type="workspace",
        source_path=str(source),
        target_path=str(source),
        notes="Created separated storage for media and annotation workspace.",
    )
    _add_dataset_event(db, record.id, "created", "Dataset created", "Created dedicated storage for media and labeling.")
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def import_dataset(db: Session, payload: DatasetImport) -> DatasetItem:
    scan = scan_dataset_path(payload.source_path)
    source = Path(payload.source_path).expanduser().resolve()
    name = payload.name or source.name
    version = _normalize_version_label(payload.version)
    _ensure_dataset_version_available(db, payload.project_id, name, version)
    family_root = _dataset_family_root_for_project(db, payload.project_id, name)
    workspace = family_root / "versions" / version
    workspace.mkdir(parents=True, exist_ok=True)
    record = DatasetRecord(
        project_id=payload.project_id,
        name=name,
        version=version,
        topic=payload.topic,
        task=payload.task,
        status="Ready",
        format=payload.format,
        source_path=str(source),
        storage_path=str(workspace),
        image_count=scan.image_count,
        video_count=scan.video_count,
        annotation_count=scan.annotation_count,
        class_count=scan.class_count,
        train_count=scan.train_count,
        val_count=scan.val_count,
        test_count=scan.test_count,
        labeled_count=scan.labeled_count,
        verified_count=scan.verified_count,
    )
    db.add(record)
    db.flush()
    _write_media_manifest(record, _collect_media_files(source))
    _add_dataset_source_record(
        db,
        record,
        name=source.name,
        source_type="import",
        source_path=str(source),
        target_path=str(source),
        split_policy="Existing folders",
        image_count=scan.image_count,
        video_count=scan.video_count,
        annotation_count=scan.annotation_count,
        class_count=scan.class_count,
        train_count=scan.train_count,
        val_count=scan.val_count,
        test_count=scan.test_count,
        notes="Imported an external dataset without copying media.",
    )
    _add_dataset_event(
        db,
        record.id,
        "import",
        "Dataset imported",
        f"Scanned {scan.image_count} images, {scan.video_count} videos, and {scan.annotation_count} annotation files.",
    )
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def update_dataset(db: Session, dataset_id: int, payload: DatasetUpdate) -> DatasetItem:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "source_path" in update_data and update_data["source_path"]:
        update_data["source_path"] = str(Path(update_data["source_path"]).expanduser().resolve())
    if "storage_path" in update_data and update_data["storage_path"]:
        update_data["storage_path"] = str(Path(update_data["storage_path"]).expanduser().resolve())
    if "version" in update_data:
        update_data["version"] = _normalize_version_label(update_data["version"])
    if any(field in update_data for field in ("name", "version", "project_id")):
        _ensure_dataset_version_available(
            db,
            update_data.get("project_id", record.project_id),
            update_data.get("name", record.name),
            update_data.get("version", record.version),
            exclude_id=record.id,
        )

    for field, value in update_data.items():
        setattr(record, field, value)

    if "source_path" in update_data and update_data["source_path"]:
        try:
            scan = scan_dataset_path(update_data["source_path"])
        except ValueError:
            scan = None
        _snapshot_dataset_media(record)
        workspace_root = _dataset_annotation_root(record, ensure=True)
        _add_dataset_source_record(
            db,
            record,
            name="Source updated",
            source_type="settings",
            source_path=record.source_path,
            target_path=str(_dataset_media_root(record, ensure=True)),
            image_count=scan.image_count if scan else 0,
            video_count=scan.video_count if scan else 0,
            annotation_count=scan.annotation_count if scan else 0,
            class_count=scan.class_count if scan else 0,
            train_count=scan.train_count if scan else 0,
            val_count=scan.val_count if scan else 0,
            test_count=scan.test_count if scan else 0,
            notes=f"Source path updated. Annotation workspace is stored in {workspace_root}.",
        )
    _apply_scan_to_record(record, _scan_dataset_record(record))
    _add_dataset_event(db, record.id, "settings", "Settings updated", "Dataset metadata has been updated.")
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def rescan_dataset(db: Session, dataset_id: int) -> DatasetItem:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")
    if not record.source_path:
        raise ValueError("Dataset source path is not configured")

    scan = _scan_dataset_record(record)
    _apply_scan_to_record(record, scan)
    _add_dataset_event(
        db,
        record.id,
        "scan",
        "Dataset rescanned",
        f"Found {scan.image_count} images, {scan.video_count} videos, and {scan.class_count} classes.",
    )
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def delete_dataset(db: Session, dataset_id: int) -> None:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")
    _delete_dataset_storage_files(db, record)
    for event in db.scalars(select(DatasetEventRecord).where(DatasetEventRecord.dataset_id == dataset_id)).all():
        db.delete(event)
    for source in db.scalars(select(DatasetSourceRecord).where(DatasetSourceRecord.dataset_id == dataset_id)).all():
        db.delete(source)
    db.delete(record)
    db.commit()


def delete_dataset_media(db: Session, dataset_id: int, path: str) -> DatasetItem:
    record = _require_dataset(db, dataset_id)
    if not path:
        raise ValueError("Media path is required")
    media_path = _validate_media_path(record, path)
    if not media_path.exists() or not media_path.is_file():
        raise ValueError(f"Media file does not exist: {media_path}")
    if media_path.suffix.lower() not in IMAGE_SUFFIXES and media_path.suffix.lower() not in VIDEO_SUFFIXES:
        raise ValueError("Only image and video files can be deleted from media view")

    family_root = _dataset_family_root_from_record(record)
    manages_shared_layout = _is_relative_to(_dataset_shared_annotation_root(record, ensure=True), family_root)
    removed_labels = 0
    if manages_shared_layout:
        removed_labels += _delete_media_companion_labels(_dataset_shared_annotation_root(record, ensure=True), media_path)
        _delete_shared_media_metadata(record, media_path)
    removed_labels += _delete_media_companion_labels(_dataset_annotation_root(record, ensure=True), media_path)
    _delete_legacy_media_metadata(record, media_path)
    _remove_dataset_media_paths(record, [media_path])
    if not _media_path_referenced_by_other_datasets(db, media_path, exclude_id=record.id) and _is_relative_to(media_path, family_root):
        try:
            media_path.unlink()
            _cleanup_empty_parent_dirs(media_path.parent, family_root)
        except OSError:
            pass
    scan = _scan_dataset_record(record)
    _apply_scan_to_record(record, scan)
    _add_dataset_event(
        db,
        record.id,
        "media",
        "Media deleted",
        f"Removed file {media_path.name}" + (f" and {removed_labels} related annotation files." if removed_labels else "."),
    )
    db.commit()
    db.refresh(record)
    return _dataset_item(record)


def apply_dataset_media_bulk_action(db: Session, dataset_id: int, payload: DatasetMediaBulkPayload) -> DatasetMediaBulkSummary:
    record = _require_dataset(db, dataset_id)
    operation = payload.operation.strip().lower()
    raw_paths = [item for item in payload.paths if item and item.strip()]
    if not raw_paths:
        raise ValueError("Select at least one media file")

    seen: set[str] = set()
    media_paths: list[Path] = []
    for raw_path in raw_paths:
        media_path = _validate_media_path(record, raw_path)
        key = str(media_path)
        if key in seen:
            continue
        seen.add(key)
        media_paths.append(media_path)

    if operation == "exclude":
        _remove_dataset_media_paths(record, media_paths)
        _apply_scan_to_record(record, _scan_dataset_record(record))
        message = f"Excluded {len(media_paths)} files from {record.version}."
        _add_dataset_event(db, record.id, "media", "Files excluded from version", message)
        db.commit()
        db.refresh(record)
        return DatasetMediaBulkSummary(
            dataset=_dataset_item(record),
            changed_files=len(media_paths),
            removed_from_version=len(media_paths),
            message=message,
        )

    if operation == "move_split":
        target_split = _clean_split_name(payload.split or "")
        if not target_split:
            raise ValueError("Target split is required")
        moved_files = 0
        for media_path in media_paths:
            _move_dataset_media_to_split(db, record, media_path, target_split)
            moved_files += 1
        _apply_scan_to_record(record, _scan_dataset_record(record))
        message = f"Moved {moved_files} files to {target_split}."
        _add_dataset_event(db, record.id, "split", "Files moved between splits", message)
        db.commit()
        db.refresh(record)
        return DatasetMediaBulkSummary(
            dataset=_dataset_item(record),
            changed_files=moved_files,
            moved_files=moved_files,
            target_split=target_split,
            message=message,
        )

    if operation == "add_tags":
        tags = _dedupe_class_names(payload.tags)
        if not tags:
            raise ValueError("Provide at least one tag")
        tagged_files = 0
        for media_path in media_paths:
            metadata = _read_media_metadata(record, media_path)
            merged_tags = _dedupe_class_names([*metadata["tags"], *tags])  # type: ignore[list-item]
            if merged_tags == metadata["tags"]:
                continue
            _write_media_metadata(record, media_path, verified=bool(metadata["verified"]), tags=merged_tags)
            tagged_files += 1
        _apply_scan_to_record(record, _scan_dataset_record(record))
        message = f"Added tags to {tagged_files} files."
        _add_dataset_event(db, record.id, "settings", "Media tags updated", f"{message} Tags: {', '.join(tags)}.")
        db.commit()
        db.refresh(record)
        return DatasetMediaBulkSummary(
            dataset=_dataset_item(record),
            changed_files=tagged_files,
            tagged_files=tagged_files,
            tags=tags,
            message=message,
        )

    raise ValueError("Unsupported bulk media operation")


def open_dataset_folder(db: Session, dataset_id: int) -> dict[str, str]:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")
    folder = _dataset_media_root(record, ensure=True)
    if not folder.exists() or not folder.is_dir():
        raise ValueError(f"Dataset folder does not exist: {folder}")
    return _open_local_folder(folder)


def _project_summary(db: Session, record: ProjectRecord) -> ProjectSummary:
    datasets = db.scalars(select(DatasetRecord).where(DatasetRecord.project_id == record.id)).all()
    return ProjectSummary(
        id=record.id,
        name=record.name,
        description=record.description,
        task=record.task,
        status=record.status,
        owner=record.owner,
        storage_path=record.storage_path,
        created_at=record.created_at,
        updated_at=record.updated_at,
        dataset_count=len(datasets),
        model_count=0,
        experiment_count=0,
        pipeline_count=0,
        image_count=sum(item.image_count for item in datasets),
        video_count=sum(item.video_count for item in datasets),
        class_count=sum(item.class_count for item in datasets),
        storage_size_bytes=_project_storage_size(record, datasets),
    )


def _project_activities(db: Session, datasets: list[DatasetRecord]) -> list[ProjectActivityItem]:
    if not datasets:
        return []
    dataset_names = {item.id: f"{item.name} {item.version}" for item in datasets}
    records = db.scalars(
        select(DatasetEventRecord)
        .where(DatasetEventRecord.dataset_id.in_(dataset_names))
        .order_by(DatasetEventRecord.created_at.desc(), DatasetEventRecord.id.desc())
        .limit(30)
    ).all()
    return [
        ProjectActivityItem(
            id=record.id,
            dataset_id=record.dataset_id,
            dataset_name=dataset_names.get(record.dataset_id, "Dataset"),
            event_type=record.event_type,
            title=record.title,
            description=record.description,
            created_at=record.created_at,
        )
        for record in records
    ]


def _project_storage_size(record: ProjectRecord, datasets: list[DatasetRecord]) -> int:
    paths: list[Path] = []
    if record.storage_path:
        paths.append(Path(record.storage_path).expanduser())
    for dataset in datasets:
        if dataset.storage_path:
            paths.append(Path(dataset.storage_path).expanduser())
        elif dataset.source_path:
            paths.append(Path(dataset.source_path).expanduser())

    total = 0
    seen: set[str] = set()
    for path in paths:
        try:
            resolved = str(path.resolve())
        except OSError:
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        total += _folder_size(path)
    return total


def _folder_size(path: Path, max_files: int = 20_000) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        try:
            return path.stat().st_size
        except OSError:
            return 0
    total = 0
    files_seen = 0
    try:
        for file_path in path.rglob("*"):
            if not file_path.is_file():
                continue
            try:
                total += file_path.stat().st_size
            except OSError:
                continue
            files_seen += 1
            if files_seen >= max_files:
                break
    except OSError:
        return total
    return total


def _dataset_item(record: DatasetRecord) -> DatasetItem:
    labeled_percent = _percent(record.labeled_count, record.image_count)
    verified_percent = _percent(record.verified_count, record.image_count)
    return DatasetItem(
        id=record.id,
        project_id=record.project_id,
        name=record.name,
        version=record.version,
        topic=record.topic,
        task=record.task,
        status=record.status,
        format=record.format,
        source_path=record.source_path,
        storage_path=record.storage_path,
        created_at=record.created_at,
        updated_at=record.updated_at,
        stats=DatasetStats(
            images=record.image_count,
            videos=record.video_count,
            annotations=record.annotation_count,
            classes=record.class_count,
            labeled=record.labeled_count,
            verified=record.verified_count,
            labeled_percent=labeled_percent,
            verified_percent=verified_percent,
        ),
        splits=DatasetSplits(train=record.train_count, val=record.val_count, test=record.test_count),
    )


def _source_item(record: DatasetSourceRecord) -> DatasetSourceItem:
    return DatasetSourceItem(
        id=record.id,
        dataset_id=record.dataset_id,
        name=record.name,
        source_type=record.source_type,
        source_path=record.source_path,
        target_path=record.target_path,
        status=record.status,
        split_policy=record.split_policy,
        images=record.image_count,
        videos=record.video_count,
        annotations=record.annotation_count,
        classes=record.class_count,
        frames=record.frame_count,
        train=record.train_count,
        val=record.val_count,
        test=record.test_count,
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _ensure_primary_source_record(db: Session, record: DatasetRecord) -> None:
    existing = db.scalar(select(func.count(DatasetSourceRecord.id)).where(DatasetSourceRecord.dataset_id == record.id)) or 0
    if existing or not record.source_path:
        return
    source_path = _dataset_media_root(record, ensure=True)
    if not source_path.exists() or not source_path.is_dir():
        return
    scan = _scan_dataset_record(record)
    _add_dataset_source_record(
        db,
        record,
        name="Workspace Storage",
        source_type="workspace",
        source_path=str(source_path),
        target_path=str(source_path),
        split_policy="Existing folders",
        image_count=scan.image_count,
        video_count=scan.video_count,
        annotation_count=scan.annotation_count,
        class_count=scan.class_count,
        train_count=scan.train_count,
        val_count=scan.val_count,
        test_count=scan.test_count,
        notes="Recovered from the current dataset storage.",
    )
    db.commit()


def _add_dataset_source_record(
    db: Session,
    record: DatasetRecord,
    *,
    name: str,
    source_type: str,
    source_path: str = "",
    target_path: str = "",
    status: str = "Ready",
    split_policy: str = "Auto",
    image_count: int = 0,
    video_count: int = 0,
    annotation_count: int = 0,
    class_count: int = 0,
    frame_count: int = 0,
    train_count: int = 0,
    val_count: int = 0,
    test_count: int = 0,
    notes: str = "",
) -> DatasetSourceRecord:
    source_record = DatasetSourceRecord(
        dataset_id=record.id,
        name=name,
        source_type=source_type,
        source_path=source_path,
        target_path=target_path,
        status=status,
        split_policy=split_policy,
        image_count=image_count,
        video_count=video_count,
        annotation_count=annotation_count,
        class_count=class_count,
        frame_count=frame_count,
        train_count=train_count,
        val_count=val_count,
        test_count=test_count,
        notes=notes,
    )
    db.add(source_record)
    return source_record


def _preview_url(path: str) -> str | None:
    if not path:
        return None
    suffix = Path(path).suffix.lower()
    if suffix not in IMAGE_SUFFIXES and suffix not in VIDEO_SUFFIXES:
        return None
    return f"/api/files/preview?path={quote(path)}"


def _filter_media(media: list, *, annotated: str | None, kind: str | None, search: str | None, split: str | None, verified: str | None) -> list:
    normalized_search = (search or "").strip().lower()
    normalized_split = (split or "All").strip().lower()
    normalized_kind = (kind or "All").strip().lower()
    normalized_annotated = (annotated or "All").strip().lower()
    normalized_verified = (verified or "All").strip().lower()

    def include(item) -> bool:
        if normalized_search and normalized_search not in item.name.lower() and normalized_search not in item.path.lower():
            return False
        if normalized_split not in {"", "all"} and item.split.lower() != normalized_split:
            return False
        if normalized_kind not in {"", "all"} and item.kind.lower() != normalized_kind:
            return False
        if normalized_annotated == "annotated" and not item.annotated:
            return False
        if normalized_annotated in {"unlabeled", "not annotated"} and item.annotated:
            return False
        if normalized_verified == "verified" and not item.verified:
            return False
        if normalized_verified in {"unverified", "not verified"} and item.verified:
            return False
        return True

    return [item for item in media if include(item)]


def _default_dataset_path(name: str, version: str) -> str:
    return str(_default_dataset_assets_path(None, name))


def _default_dataset_assets_path(project_id: int | None, name: str) -> Path:
    return _dataset_family_root(project_id, name) / "assets"


def _default_dataset_workspace_path(project_id: int | None, name: str, version: str) -> Path:
    return _dataset_family_root(project_id, name) / "versions" / _normalize_version_label(version)


def _dataset_family_root_for_project(db: Session, project_id: int | None, name: str) -> Path:
    if project_id is None:
        return _dataset_family_root(project_id, name)

    project = db.get(ProjectRecord, project_id)
    if project is None or not project.storage_path:
        return _dataset_family_root(project_id, name)

    return Path(project.storage_path).expanduser().resolve() / (_path_slug(name) or "dataset")


def _dataset_family_root_from_record(record: DatasetRecord) -> Path:
    if record.storage_path:
        storage_root = Path(record.storage_path).expanduser().resolve()
        if storage_root.parent.name.lower() == "versions":
            return storage_root.parent.parent
    if record.source_path:
        source_root = Path(record.source_path).expanduser().resolve()
        if source_root.name.lower() == "assets":
            return source_root.parent
    return _dataset_family_root(record.project_id, record.name)


def _dataset_family_root(project_id: int | None, name: str) -> Path:
    project_slug = f"project_{project_id}" if project_id is not None else "shared"
    dataset_slug = _path_slug(name) or "dataset"
    return INTERNAL_DATASETS_DIR / project_slug / dataset_slug


def _media_manifest_path(record: DatasetRecord) -> Path:
    return _version_state_root(record) / MEDIA_MANIFEST_FILENAME


def _is_supported_media_path(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_SUFFIXES or path.suffix.lower() in VIDEO_SUFFIXES


def _collect_media_files(root: Path) -> list[Path]:
    if not root.exists() or not root.is_dir():
        return []
    return [
        path.resolve()
        for path in sorted(root.rglob("*"))
        if path.is_file() and not _is_ignored_path(path) and _is_supported_media_path(path)
    ]


def _read_media_manifest_payload(record: DatasetRecord) -> list[str] | None:
    manifest_path = _media_manifest_path(record)
    if not manifest_path.exists() or not manifest_path.is_file():
        return None
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, list):
        return None
    return [str(item).strip() for item in payload if isinstance(item, str) and str(item).strip()]


def _read_media_manifest(record: DatasetRecord) -> list[Path] | None:
    payload = _read_media_manifest_payload(record)
    if payload is None:
        return None

    paths: list[Path] = []
    seen: set[str] = set()
    for raw_value in payload:
        try:
            candidate = Path(raw_value).expanduser().resolve()
        except OSError:
            continue
        resolved = str(candidate)
        if resolved in seen or not candidate.exists() or not candidate.is_file() or not _is_supported_media_path(candidate):
            continue
        seen.add(resolved)
        paths.append(candidate)
    return paths


def _write_media_manifest(record: DatasetRecord, paths: list[Path]) -> list[Path]:
    manifest_path = _media_manifest_path(record)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    normalized: list[Path] = []
    seen: set[str] = set()
    for raw_path in paths:
        try:
            candidate = Path(raw_path).expanduser().resolve()
        except OSError:
            continue
        resolved = str(candidate)
        if resolved in seen or not candidate.exists() or not candidate.is_file() or not _is_supported_media_path(candidate):
            continue
        seen.add(resolved)
        normalized.append(candidate)

    manifest_path.write_text(json.dumps([str(path) for path in normalized], indent=2), encoding="utf-8")
    return normalized


def _snapshot_dataset_media(record: DatasetRecord) -> list[Path]:
    return _write_media_manifest(record, _collect_media_files(_dataset_media_root(record, ensure=True)))


def _repair_dataset_media_manifest(record: DatasetRecord) -> list[Path]:
    raw_manifest = _read_media_manifest_payload(record)
    if raw_manifest is None:
        return _snapshot_dataset_media(record)
    normalized: list[Path] = []
    for raw_value in raw_manifest:
        try:
            normalized.append(Path(raw_value).expanduser().resolve())
        except OSError:
            continue
    return _write_media_manifest(record, normalized)


def _dataset_media_paths(record: DatasetRecord) -> list[Path]:
    manifest_paths = _read_media_manifest(record)
    if manifest_paths is not None:
        refreshed_paths = _write_media_manifest(record, manifest_paths)
        return refreshed_paths
    return _snapshot_dataset_media(record)


def _append_dataset_media_paths(record: DatasetRecord, paths: list[Path]) -> list[Path]:
    current = _dataset_media_paths(record)
    return _write_media_manifest(record, current + paths)


def _remove_dataset_media_paths(record: DatasetRecord, paths: list[Path]) -> list[Path]:
    removed = {str(Path(path).expanduser().resolve()) for path in paths}
    remaining = [path for path in _dataset_media_paths(record) if str(path) not in removed]
    return _write_media_manifest(record, remaining)


def _dataset_version_summary(db: Session, record: DatasetRecord) -> DatasetVersionSummary:
    media_items = _dataset_media_items(record, limit=200_000)
    raw_manifest = _read_media_manifest_payload(record)
    tracked_files = len(media_items)
    missing_files = 0

    if raw_manifest is not None:
        normalized_entries: set[str] = set()
        for raw_value in raw_manifest:
            try:
                normalized_entries.add(str(Path(raw_value).expanduser().resolve()))
            except OSError:
                continue
        missing_files = max(0, len(normalized_entries) - tracked_files)

    source_count = db.scalar(select(func.count(DatasetSourceRecord.id)).where(DatasetSourceRecord.dataset_id == record.id)) or 0
    sample_files = [
        DatasetVersionSampleItem(
            path=item.path,
            name=item.name,
            kind=item.kind,
            split=item.split,
            annotated=item.annotated,
            verified=item.verified,
        )
        for item in media_items[:5]
    ]

    return DatasetVersionSummary(
        dataset=_dataset_item(record),
        source_count=int(source_count),
        has_manifest=raw_manifest is not None,
        manifest_path=str(_media_manifest_path(record)),
        tracked_files=tracked_files,
        missing_files=missing_files,
        image_files=sum(1 for item in media_items if item.kind == "image"),
        video_files=sum(1 for item in media_items if item.kind == "video"),
        annotated_files=sum(1 for item in media_items if item.kind == "image" and item.annotated),
        verified_files=sum(1 for item in media_items if item.kind == "image" and item.verified),
        sample_files=sample_files,
    )


def _dataset_media_items(record: DatasetRecord, *, limit: int) -> list[MediaItemResult]:
    labeled_stems = _dataset_annotation_stems(record)
    items = list_dataset_media_paths([str(path) for path in _dataset_media_paths(record)], limit=max(limit, 1))
    enriched: list[MediaItemResult] = []
    for item in items:
        media_path = Path(item.path).expanduser().resolve()
        metadata = _read_media_metadata(record, media_path)
        enriched.append(
            MediaItemResult(
                id=item.id,
                name=item.name,
                path=item.path,
                kind=item.kind,
                split=item.split,
                annotated=item.kind == "image" and media_path.stem.lower() in labeled_stems,
                verified=bool(metadata["verified"]),
                width=item.width,
                height=item.height,
            )
        )
    return enriched


def _version_state_root(record: DatasetRecord) -> Path:
    return _dataset_annotation_root(record, ensure=True) / WORKSPACE_STATE_DIRNAME


def _shared_state_root(record: DatasetRecord) -> Path:
    return _dataset_media_root(record, ensure=True) / WORKSPACE_STATE_DIRNAME


def _media_metadata_path(record: DatasetRecord, media_path: Path) -> Path:
    split = _split_folder_name(_split_from_path(media_path))
    return _shared_state_root(record) / "media" / split / f"{media_path.stem}{MEDIA_METADATA_EXTENSION}"


def _legacy_media_metadata_path(record: DatasetRecord, media_path: Path) -> Path:
    split = _split_folder_name(_split_from_path(media_path))
    return _version_state_root(record) / "media" / split / f"{media_path.stem}{MEDIA_METADATA_EXTENSION}"


def _tag_catalog_path(record: DatasetRecord) -> Path:
    return _shared_state_root(record) / TAG_CATALOG_FILENAME


def _legacy_tag_catalog_path(record: DatasetRecord) -> Path:
    return _version_state_root(record) / TAG_CATALOG_FILENAME


def _read_media_metadata(record: DatasetRecord, media_path: Path) -> dict[str, object]:
    path = _media_metadata_path(record, media_path)
    if (not path.exists() or not path.is_file()) and _legacy_media_metadata_path(record, media_path).exists():
        path = _legacy_media_metadata_path(record, media_path)
    if not path.exists() or not path.is_file():
        return {"verified": False, "tags": []}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"verified": False, "tags": []}

    tags = payload.get("tags") if isinstance(payload, dict) else []
    verified = bool(payload.get("verified")) if isinstance(payload, dict) else False
    normalized_tags = _dedupe_class_names([str(item) for item in tags if str(item).strip()]) if isinstance(tags, list) else []
    return {"verified": verified, "tags": normalized_tags}


def _write_media_metadata(record: DatasetRecord, media_path: Path, *, verified: bool, tags: list[str]) -> None:
    normalized_tags = _dedupe_class_names(tags)
    path = _media_metadata_path(record, media_path)
    if not verified and not normalized_tags:
        if path.exists():
            try:
                path.unlink()
            except OSError:
                pass
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"verified": verified, "tags": normalized_tags}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _read_tag_catalog(record: DatasetRecord) -> list[str]:
    path = _tag_catalog_path(record)
    if (not path.exists() or not path.is_file()) and _legacy_tag_catalog_path(record).exists():
        path = _legacy_tag_catalog_path(record)
    if not path.exists() or not path.is_file():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if isinstance(payload, dict):
        payload = payload.get("tags", [])
    if not isinstance(payload, list):
        return []
    return _dedupe_class_names([str(item) for item in payload if str(item).strip()])


def _write_tag_catalog(record: DatasetRecord, tags: list[str]) -> list[str]:
    normalized_tags = _dedupe_class_names(tags)
    path = _tag_catalog_path(record)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"tags": normalized_tags}, indent=2), encoding="utf-8")
    return normalized_tags


def _require_dataset(db: Session, dataset_id: int) -> DatasetRecord:
    ensure_seed_data(db)
    record = db.get(DatasetRecord, dataset_id)
    if record is None:
        raise LookupError("Dataset not found")
    return record


def _require_dataset_folder(record: DatasetRecord) -> Path:
    return _dataset_media_root(record, ensure=True)


def _dataset_media_root(record: DatasetRecord, *, ensure: bool = False) -> Path:
    root = Path(record.source_path or _default_dataset_path(record.name, record.version)).expanduser().resolve()
    if ensure:
        root.mkdir(parents=True, exist_ok=True)
        record.source_path = str(root)
    return root


def _dataset_annotation_root(record: DatasetRecord, *, ensure: bool = False) -> Path:
    root = Path(record.storage_path or _default_dataset_workspace_path(record.project_id, record.name, record.version)).expanduser().resolve()
    if ensure:
        root.mkdir(parents=True, exist_ok=True)
        record.storage_path = str(root)
    return root


def _dataset_classes_root(record: DatasetRecord, *, ensure: bool = False) -> Path:
    return _dataset_media_root(record, ensure=ensure)


def _dataset_shared_annotation_root(record: DatasetRecord, *, ensure: bool = False) -> Path:
    return _dataset_media_root(record, ensure=ensure)


def _legacy_annotation_search_root(record: DatasetRecord) -> Path:
    return _dataset_annotation_root(record, ensure=True)


def _has_annotation_workspace(root: Path) -> bool:
    if not root.exists() or not root.is_dir():
        return False
    for path in root.rglob("*"):
        if not path.is_file() or _is_ignored_path(path):
            continue
        if path.name.lower() in CLASS_NAME_FILES or path.suffix.lower() in ANNOTATION_SUFFIXES:
            return True
    return False


def _read_class_names(source_path: str) -> list[str]:
    root = Path(source_path).expanduser().resolve()
    for name in ("classes.txt", "labels.txt", "names.txt"):
        file_path = root / name
        if file_path.exists():
            try:
                return [line.strip() for line in file_path.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip()]
            except OSError:
                return []
    return []


def _read_dataset_class_names(record: DatasetRecord) -> list[str]:
    root = _dataset_class_index_root(record)
    return _read_class_names(str(root))


def _write_class_names(source_path: str, class_names: list[str]) -> None:
    root = Path(source_path).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    (root / "classes.txt").write_text("\n".join(_dedupe_class_names(class_names)) + "\n", encoding="utf-8")


def _is_ignored_path(path: Path) -> bool:
    lowered = path.name.lower()
    return (
        lowered.startswith("._")
        or lowered in IGNORED_SYSTEM_FILENAMES
        or lowered in {"media_manifest.json", MEDIA_MANIFEST_FILENAME.lower()}
        or WORKSPACE_STATE_DIRNAME in {part.lower() for part in path.parts}
    )


def _dedupe_class_names(class_names: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for raw_name in class_names:
        name = raw_name.strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(name)
    return result


def _collect_annotation_stems(root: Path) -> set[str]:
    stems: set[str] = set()
    if not root.exists() or not root.is_dir():
        return stems
    for path in root.rglob("*"):
        if _is_ignored_path(path):
            continue
        if path.is_file() and path.suffix.lower() in ANNOTATION_SUFFIXES and path.name.lower() not in CLASS_NAME_FILES:
            stems.add(path.stem.lower())
    return stems


def _dataset_annotation_stems(record: DatasetRecord) -> set[str]:
    stems = _collect_annotation_stems(_dataset_shared_annotation_root(record, ensure=True))
    legacy_root = _legacy_annotation_search_root(record)
    if legacy_root != _dataset_shared_annotation_root(record, ensure=False):
        stems |= _collect_annotation_stems(legacy_root)
    return stems


def _dataset_class_index_root(record: DatasetRecord) -> Path:
    shared_root = _dataset_classes_root(record, ensure=True)
    if _read_class_names(str(shared_root)):
        return shared_root
    legacy_root = _legacy_annotation_search_root(record)
    if _read_class_names(str(legacy_root)):
        return legacy_root
    return shared_root


def _count_annotation_files(root: Path) -> int:
    if not root.exists() or not root.is_dir():
        return 0
    total = 0
    for path in root.rglob("*"):
        if _is_ignored_path(path):
            continue
        if path.is_file() and path.suffix.lower() in ANNOTATION_SUFFIXES and path.name.lower() not in CLASS_NAME_FILES:
            total += 1
    return total


def _copy_annotation_workspace(source_root: Path, target_root: Path) -> int:
    if not source_root.exists() or not source_root.is_dir():
        return 0
    copied = 0
    for path in sorted(source_root.rglob("*")):
        if not path.is_file() or _is_ignored_path(path):
            continue
        if path.suffix.lower() not in ANNOTATION_SUFFIXES and path.name.lower() not in CLASS_NAME_FILES:
            continue
        relative = path.relative_to(source_root)
        destination = target_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        copied += 1
    return copied


def _validate_media_path(record: DatasetRecord, raw_path: str) -> Path:
    media_root = _dataset_media_root(record, ensure=True)
    media_path = Path(raw_path).expanduser().resolve()
    if _is_relative_to(media_path, media_root):
        return media_path
    if any(candidate == media_path for candidate in _dataset_media_paths(record)):
        return media_path
    raise ValueError("Media file must belong to the current dataset snapshot")
    return media_path


def _annotation_file_for_media(record: DatasetRecord, media_path: Path) -> Path | None:
    shared_root = _dataset_shared_annotation_root(record, ensure=True)
    normalized = _normalized_annotation_path(shared_root, media_path)
    if normalized.exists():
        return normalized

    legacy_normalized = _normalized_annotation_path(_legacy_annotation_search_root(record), media_path)
    if legacy_normalized.exists():
        return legacy_normalized

    candidates = [_dataset_media_root(record, ensure=False), _legacy_annotation_search_root(record)]
    for root in candidates:
        if not root.exists() or not root.is_dir():
            continue
        for suffix in (".txt", ".json", ".xml", ".yaml", ".yml", ".csv"):
            direct = root / f"{media_path.stem}{suffix}"
            if direct.exists():
                return direct
        for path in root.rglob("*"):
            if path.is_file() and path.stem.lower() == media_path.stem.lower() and path.suffix.lower() in ANNOTATION_SUFFIXES:
                return path
    return normalized


def _normalized_annotation_path(workspace_root: Path, media_path: Path) -> Path:
    split = _split_from_path(media_path)
    return workspace_root / "labels" / _split_folder_name(split) / f"{media_path.stem}.txt"


def _read_annotation_file(path: Path) -> list[DatasetAnnotationShape]:
    if path.suffix.lower() != ".txt":
        return []
    items: list[DatasetAnnotationShape] = []
    try:
        for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) != 5:
                continue
            class_id, x_center, y_center, width, height = parts
            try:
                items.append(
                    DatasetAnnotationShape(
                        class_id=int(class_id),
                        x_center=float(x_center),
                        y_center=float(y_center),
                        width=float(width),
                        height=float(height),
                    )
                )
            except ValueError:
                continue
    except OSError:
        return []
    return items


def _annotation_text(annotations: list[DatasetAnnotationShape]) -> str:
    rows = [
        f"{item.class_id} {item.x_center:.6f} {item.y_center:.6f} {item.width:.6f} {item.height:.6f}"
        for item in annotations
    ]
    return ("\n".join(rows) + "\n") if rows else ""


def _touch_scan_counts(record: DatasetRecord) -> None:
    _apply_scan_to_record(record, _scan_dataset_record(record))


def _scan_dataset_record(record: DatasetRecord) -> ScanResult:
    media_items = _dataset_media_items(record, limit=200_000)
    labeled_stems = _dataset_annotation_stems(record)
    image_count = sum(1 for item in media_items if item.kind == "image")
    video_count = sum(1 for item in media_items if item.kind == "video")
    train_count = sum(1 for item in media_items if item.kind == "image" and item.split == "Train")
    val_count = sum(1 for item in media_items if item.kind == "image" and item.split in {"Val", "Validation"})
    test_count = sum(1 for item in media_items if item.kind == "image" and item.split == "Test")
    verified_count = sum(1 for item in media_items if item.kind == "image" and item.verified)
    labeled_count = sum(1 for item in media_items if item.kind == "image" and Path(item.path).stem.lower() in labeled_stems)
    annotation_count = labeled_count
    class_index_root = _dataset_class_index_root(record)
    class_names = _read_dataset_class_names(record)
    classes = list_dataset_classes(str(class_index_root))

    return ScanResult(
        image_count=image_count,
        video_count=video_count,
        annotation_count=annotation_count,
        class_count=len(class_names) or len(classes),
        train_count=train_count,
        val_count=val_count,
        test_count=test_count,
        labeled_count=labeled_count,
        verified_count=verified_count,
    )


def _apply_scan_to_record(record: DatasetRecord, scan) -> None:
    record.image_count = scan.image_count
    record.video_count = scan.video_count
    record.annotation_count = scan.annotation_count
    record.class_count = scan.class_count
    record.train_count = scan.train_count
    record.val_count = scan.val_count
    record.test_count = scan.test_count
    record.labeled_count = scan.labeled_count
    record.verified_count = scan.verified_count


def _clean_split_name(value: str) -> str:
    name = " ".join(value.strip().split())
    if name.lower() == "val":
        return "Validation"
    return name


def _split_folder_name(split: str) -> str:
    normalized = split.strip().lower()
    if normalized in {"validation", "valid"}:
        return "val"
    if normalized in {"train", "test"}:
        return normalized
    return _path_slug(normalized or "custom")


def _choose_upload_split(record: DatasetRecord, split_policy: str, pending_counts: dict[str, int]) -> str:
    policy = split_policy.strip()
    if policy in {"Train", "Val", "Test"}:
        return policy
    if policy == "Validation":
        return "Val"
    if policy and policy.lower() not in {"auto", "balanced"}:
        return policy

    counts = {
        "Train": record.train_count + pending_counts.get("Train", 0),
        "Val": record.val_count + pending_counts.get("Val", 0),
        "Test": record.test_count + pending_counts.get("Test", 0),
    }
    total = sum(counts.values()) + 1
    deficits = {
        split: (TARGET_SPLIT_RATIO[split] * total) - counts[split]
        for split in ("Train", "Val", "Test")
    }
    return max(deficits, key=deficits.get)


def _copy_source_assets(
    record: DatasetRecord,
    source: Path,
    media_root: Path,
    annotation_root: Path,
    split_policy: str,
    extract_video_frames: bool,
    frame_interval: int,
) -> tuple[dict[str, int], int, list[str], list[Path]]:
    warnings: list[str] = []
    pending_split_counts = {"Train": 0, "Val": 0, "Test": 0}
    stem_splits: dict[str, str] = {}
    saved_media_paths: list[Path] = []
    counts = {
        "images": 0,
        "videos": 0,
        "annotations": 0,
        "classes": 0,
        "train": 0,
        "val": 0,
        "test": 0,
    }
    frames_saved = 0

    media_files = [
        path
        for path in sorted(source.rglob("*"))
        if path.is_file() and not _is_ignored_path(path) and path.suffix.lower() in IMAGE_SUFFIXES | VIDEO_SUFFIXES
    ]
    for path in media_files:
        suffix = path.suffix.lower()
        split = _source_file_split(record, path, source, split_policy, pending_split_counts)
        split_folder = _split_folder_name(split)
        target_kind = "videos" if suffix in VIDEO_SUFFIXES else "images"
        destination = _unique_path(media_root / target_kind / split_folder / path.name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        saved_media_paths.append(destination.resolve())

        stem_splits[path.stem.lower()] = split
        pending_split_counts[split] = pending_split_counts.get(split, 0) + 1
        _increment_split_count(counts, split)
        if suffix in VIDEO_SUFFIXES:
            counts["videos"] += 1
            if extract_video_frames:
                extracted_paths = _extract_video_frames(destination, media_root / "images" / split_folder, frame_interval)
                if extracted_paths is None:
                    warnings.append(f"Saved {path.name}, but frame extraction needs opencv-python-headless or ffmpeg in PATH.")
                else:
                    frames_saved += len(extracted_paths)
                    counts["images"] += len(extracted_paths)
                    _increment_split_count(counts, split, len(extracted_paths))
                    saved_media_paths.extend(extracted_paths)
        else:
            counts["images"] += 1

    annotation_files = [
        path
        for path in sorted(source.rglob("*"))
        if path.is_file() and not _is_ignored_path(path) and path.suffix.lower() in ANNOTATION_SUFFIXES
    ]
    for path in annotation_files:
        if path.suffix.lower() in {".yaml", ".yml"} or path.name.lower() in CLASS_NAME_FILES:
            destination = _unique_path(annotation_root / path.name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)
            counts["classes"] += 1
            continue

        split = stem_splits.get(path.stem.lower()) or _source_file_split(record, path, source, split_policy, pending_split_counts)
        destination = _unique_path(annotation_root / "labels" / _split_folder_name(split) / path.name)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
        counts["annotations"] += 1

    try:
        scan = scan_dataset_path(str(source))
        counts["classes"] = max(counts["classes"], scan.class_count)
    except ValueError:
        pass

    return counts, frames_saved, warnings, saved_media_paths


def _source_file_split(record: DatasetRecord, path: Path, source_root: Path, split_policy: str, pending_counts: dict[str, int]) -> str:
    policy = split_policy.strip()
    if policy in {"Train", "Val", "Test"}:
        return policy
    if policy == "Validation":
        return "Val"

    parts = {part.lower() for part in path.relative_to(source_root).parts[:-1]}
    if "train" in parts:
        return "Train"
    if "val" in parts or "valid" in parts or "validation" in parts:
        return "Val"
    if "test" in parts:
        return "Test"
    return _choose_upload_split(record, split_policy, pending_counts)


def _increment_split_count(counts: dict[str, int], split: str, amount: int = 1) -> None:
    if split == "Train":
        counts["train"] += amount
    elif split == "Val" or split == "Validation":
        counts["val"] += amount
    elif split == "Test":
        counts["test"] += amount


def _unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    index = 2
    while True:
        candidate = parent / f"{stem}_{index}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def _move_file_if_exists(source: Path, destination: Path) -> bool:
    if not source.exists() or not source.is_file():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(destination))
    return True


def _rewrite_media_path_references(db: Session, old_path: Path, new_path: Path) -> None:
    old_key = str(old_path.expanduser().resolve())
    new_value = new_path.expanduser().resolve()
    for candidate in db.scalars(select(DatasetRecord)).all():
        media_paths = _dataset_media_paths(candidate)
        changed = False
        rewritten: list[Path] = []
        for item in media_paths:
            if str(item) == old_key:
                rewritten.append(new_value)
                changed = True
            else:
                rewritten.append(item)
        if changed:
            _write_media_manifest(candidate, rewritten)
            _apply_scan_to_record(candidate, _scan_dataset_record(candidate))


def _move_dataset_media_to_split(db: Session, record: DatasetRecord, media_path: Path, target_split: str) -> Path:
    media_root = _dataset_media_root(record, ensure=True)
    if not _is_relative_to(media_path, media_root):
        raise ValueError(f"Cannot move external file between splits: {media_path.name}")

    normalized_split = _split_folder_name(target_split)
    folder_kind = "videos" if media_path.suffix.lower() in VIDEO_SUFFIXES else "images"
    destination = _unique_path(media_root / folder_kind / normalized_split / media_path.name)
    old_media_path = media_path.expanduser().resolve()
    shutil.move(str(old_media_path), str(destination))
    new_media_path = destination.expanduser().resolve()

    shared_root = _dataset_shared_annotation_root(record, ensure=True)
    _move_file_if_exists(_normalized_annotation_path(shared_root, old_media_path), _normalized_annotation_path(shared_root, new_media_path))
    legacy_root = _legacy_annotation_search_root(record)
    if legacy_root != shared_root:
        _move_file_if_exists(_normalized_annotation_path(legacy_root, old_media_path), _normalized_annotation_path(legacy_root, new_media_path))

    _move_file_if_exists(_media_metadata_path(record, old_media_path), _media_metadata_path(record, new_media_path))
    _move_file_if_exists(_legacy_media_metadata_path(record, old_media_path), _legacy_media_metadata_path(record, new_media_path))
    _rewrite_media_path_references(db, old_media_path, new_media_path)
    _cleanup_empty_parent_dirs(old_media_path.parent, media_root)
    return new_media_path


def _link_or_copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, destination)
        return
    except OSError:
        shutil.copy2(source, destination)


def _yolo_data_yaml(class_names: list[str]) -> str:
    rows = [
        "path: .",
        "train: images/train",
        "val: images/val",
        "test: images/test",
        f"nc: {len(class_names)}",
        "names:",
    ]
    rows.extend(f"  {index}: {json.dumps(name, ensure_ascii=False)}" for index, name in enumerate(class_names))
    return "\n".join(rows) + "\n"


def _extract_video_frames(video_path: Path, output_dir: Path, frame_interval: int) -> list[Path] | None:
    extracted = _extract_video_frames_with_ffmpeg(video_path, output_dir, frame_interval)
    if extracted is not None:
        return extracted
    return _extract_video_frames_with_opencv(video_path, output_dir, frame_interval)


def _extract_video_frames_with_ffmpeg(video_path: Path, output_dir: Path, frame_interval: int) -> list[Path] | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return None
    output_dir.mkdir(parents=True, exist_ok=True)
    frame_step = max(frame_interval, 1)
    pattern = output_dir / f"{video_path.stem}_frame_%06d.jpg"
    before = {path.resolve() for path in output_dir.glob(f"{video_path.stem}_frame_*.jpg")}
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(video_path),
        "-vf",
        f"select='not(mod(n\\,{frame_step}))'",
        "-vsync",
        "vfr",
        str(pattern),
    ]
    try:
        completed = subprocess.run(command, check=False, timeout=600)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    after = {path.resolve() for path in output_dir.glob(f"{video_path.stem}_frame_*.jpg")}
    return sorted(after - before)


def _extract_video_frames_with_opencv(video_path: Path, output_dir: Path, frame_interval: int) -> list[Path] | None:
    try:
        import cv2  # type: ignore[import-not-found]
    except ImportError:
        return None

    output_dir.mkdir(parents=True, exist_ok=True)
    frame_step = max(frame_interval, 1)
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        capture.release()
        return None

    saved_paths: list[Path] = []
    selected_index = 1
    frame_index = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            if frame_index % frame_step == 0:
                destination = output_dir / f"{video_path.stem}_frame_{selected_index:06d}.jpg"
                selected_index += 1
                if destination.exists():
                    frame_index += 1
                    continue
                if cv2.imwrite(str(destination), frame):
                    saved_paths.append(destination.resolve())
            frame_index += 1
    finally:
        capture.release()
    return saved_paths


def _source_video_files(record: DatasetRecord, source_record: DatasetSourceRecord) -> list[Path]:
    candidates: list[Path] = []
    for raw_path in (source_record.target_path, source_record.source_path, record.source_path):
        if raw_path and raw_path != "browser upload":
            candidates.append(Path(raw_path).expanduser())

    seen: set[str] = set()
    result: list[Path] = []
    for root in candidates:
        if not root.exists():
            continue
        if root.is_file() and root.suffix.lower() in VIDEO_SUFFIXES:
            files = [root]
        elif root.is_dir():
            files = [path for path in sorted(root.rglob("*")) if path.is_file() and path.suffix.lower() in VIDEO_SUFFIXES]
        else:
            files = []
        for path in files:
            key = str(path.resolve())
            if key in seen:
                continue
            seen.add(key)
            result.append(path)
    return result


def _split_from_path(path: Path) -> str:
    parts = {part.lower() for part in path.parts}
    if "val" in parts or "valid" in parts or "validation" in parts:
        return "Val"
    if "test" in parts:
        return "Test"
    return "Train"


def _probe_video(path: Path) -> dict[str, float | int]:
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        return {}
    command = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=avg_frame_rate,nb_frames,duration:format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        result = subprocess.run(command, check=False, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return {}
    if result.returncode != 0 or not result.stdout:
        return {}
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}

    stream = (payload.get("streams") or [{}])[0]
    duration = _float_or_none(stream.get("duration")) or _float_or_none((payload.get("format") or {}).get("duration"))
    fps = _parse_fps(stream.get("avg_frame_rate"))
    total_frames = _int_or_none(stream.get("nb_frames"))
    if total_frames is None and duration and fps:
        total_frames = int(round(duration * fps))

    data: dict[str, float | int] = {}
    if duration is not None:
        data["duration_seconds"] = round(duration, 3)
    if fps is not None:
        data["fps"] = round(fps, 3)
    if total_frames is not None:
        data["total_frames"] = total_frames
    return data


def _estimated_frame_count(total_frames: float | int | None, duration: float | int | None, fps: float | int | None, frame_interval: int) -> int:
    frame_step = max(frame_interval, 1)
    if total_frames:
        return ceil(float(total_frames) / frame_step)
    if duration and fps:
        return ceil((float(duration) * float(fps)) / frame_step)
    return 0


def _parse_fps(value) -> float | None:
    if not value:
        return None
    text = str(value)
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        top = _float_or_none(numerator)
        bottom = _float_or_none(denominator)
        if top is None or not bottom:
            return None
        return top / bottom
    return _float_or_none(text)


def _float_or_none(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int_or_none(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _add_dataset_event(db: Session, dataset_id: int, event_type: str, title: str, description: str) -> None:
    db.add(
        DatasetEventRecord(
            dataset_id=dataset_id,
            event_type=event_type,
            title=title,
            description=description,
            created_at=datetime.now(timezone.utc),
        )
    )


def _event_item(record: DatasetEventRecord) -> DatasetEventItem:
    return DatasetEventItem(
        id=record.id,
        dataset_id=record.dataset_id,
        event_type=record.event_type,
        title=record.title,
        description=record.description,
        author=record.author,
        created_at=record.created_at,
    )


def _next_version_label(version: str) -> str:
    raw = version.strip().lower().lstrip("v")
    parts = raw.split(".")
    try:
        numbers = [int(part) for part in parts if part != ""]
    except ValueError:
        return "v1.0"
    if not numbers:
        return "v1.0"
    if len(numbers) == 1:
        numbers.append(0)
    numbers[-1] += 1
    return "v" + ".".join(str(part) for part in numbers)


def _normalize_version_label(version: str) -> str:
    value = (version or "").strip()
    if not value:
        return "v1.0"
    return value if value.lower().startswith("v") else f"v{value}"


def _dataset_version_query(project_id: int | None, name: str, version: str):
    conditions = [
        func.lower(DatasetRecord.name) == name.strip().lower(),
        func.lower(DatasetRecord.version) == _normalize_version_label(version).lower(),
    ]
    if project_id is None:
        conditions.append(DatasetRecord.project_id.is_(None))
    else:
        conditions.append(DatasetRecord.project_id == project_id)
    return select(func.count(DatasetRecord.id)).where(*conditions)


def _dataset_version_record_query(project_id: int | None, name: str, version: str):
    conditions = [
        func.lower(DatasetRecord.name) == name.strip().lower(),
        func.lower(DatasetRecord.version) == _normalize_version_label(version).lower(),
    ]
    if project_id is None:
        conditions.append(DatasetRecord.project_id.is_(None))
    else:
        conditions.append(DatasetRecord.project_id == project_id)
    return select(DatasetRecord).where(*conditions).limit(1)


def _ensure_dataset_version_available(
    db: Session,
    project_id: int | None,
    name: str,
    version: str,
    *,
    exclude_id: int | None = None,
) -> None:
    query = _dataset_version_query(project_id, name, version)
    if exclude_id is not None:
        query = query.where(DatasetRecord.id != exclude_id)
    existing = db.scalar(query) or 0
    if existing:
        raise ValueError(f"Dataset {name} {_normalize_version_label(version)} already exists in this project.")


def _next_available_version_label(db: Session, source_record: DatasetRecord, requested_version: str | None) -> str:
    if requested_version and requested_version.strip():
        next_version = _normalize_version_label(requested_version)
        _ensure_dataset_version_available(db, source_record.project_id, source_record.name, next_version)
        return next_version

    next_version = _next_version_label(source_record.version)
    for _ in range(100):
        try:
            _ensure_dataset_version_available(db, source_record.project_id, source_record.name, next_version)
            return next_version
        except ValueError:
            next_version = _next_version_label(next_version)
    raise ValueError(f"Could not find a free version label for {source_record.name}.")


def _clone_dataset_folder(source_root: Path, target_root: Path) -> None:
    if not source_root.exists() or not source_root.is_dir():
        target_root.mkdir(parents=True, exist_ok=True)
        return
    if source_root == target_root:
        return
    if target_root.exists() and any(target_root.iterdir()):
        raise ValueError(f"Version folder already exists and is not empty: {target_root}")
    target_root.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_root, target_root, copy_function=_link_or_copy_file, dirs_exist_ok=True)


def _link_or_copy_file(source: str, target: str) -> str:
    source_path = Path(source)
    if source_path.suffix.lower() in ANNOTATION_SUFFIXES or source_path.name.lower() in CLASS_NAME_FILES:
        shutil.copy2(source, target)
        return target
    try:
        os.link(source, target)
    except OSError:
        shutil.copy2(source, target)
    return target


def _clone_dataset_source_records(
    db: Session,
    source_record: DatasetRecord,
    target_record: DatasetRecord,
    source_root: Path | None,
    target_root: Path | None,
) -> int:
    records = db.scalars(
        select(DatasetSourceRecord)
        .where(DatasetSourceRecord.dataset_id == source_record.id)
        .order_by(DatasetSourceRecord.created_at.asc(), DatasetSourceRecord.id.asc())
    ).all()
    for source in records:
        _add_dataset_source_record(
            db,
            target_record,
            name=source.name,
            source_type=source.source_type,
            source_path=source.source_path,
            target_path=_map_cloned_path(source.target_path, source_root, target_root),
            status=source.status,
            split_policy=source.split_policy,
            image_count=source.image_count,
            video_count=source.video_count,
            annotation_count=source.annotation_count,
            class_count=source.class_count,
            frame_count=source.frame_count,
            train_count=source.train_count,
            val_count=source.val_count,
            test_count=source.test_count,
            notes=f"{source.notes}\nSnapshot copied from {source_record.version}.".strip(),
        )
    return len(records)


def _map_cloned_path(path: str, source_root: Path | None, target_root: Path | None) -> str:
    if not path or source_root is None or target_root is None:
        return path
    candidate = Path(path)
    if not candidate.is_absolute():
        return path
    try:
        relative_path = candidate.expanduser().resolve().relative_to(source_root)
    except (OSError, ValueError):
        return path
    return str(target_root / relative_path)


def _delete_media_companion_labels(root: Path, media_path: Path) -> int:
    candidates: set[Path] = set()
    for suffix in ANNOTATION_SUFFIXES:
        candidates.add(media_path.with_suffix(suffix))
    split_folder = _split_from_path(media_path)
    labels_root = root / "labels"
    for suffix in ANNOTATION_SUFFIXES:
        candidates.add(labels_root / _split_folder_name(split_folder) / f"{media_path.stem}{suffix}")
        candidates.add(labels_root / f"{media_path.stem}{suffix}")

    removed = 0
    for candidate in candidates:
        try:
            resolved = candidate.expanduser().resolve()
            resolved.relative_to(root)
        except (OSError, ValueError):
            continue
        if resolved == media_path or not resolved.exists() or not resolved.is_file():
            continue
        try:
            resolved.unlink()
            removed += 1
        except OSError:
            continue
    return removed


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
    except (OSError, ValueError):
        return False
    return True


def _cleanup_empty_parent_dirs(start: Path, stop: Path) -> None:
    current = start
    while current != stop and current.exists():
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent


def _media_path_referenced_by_other_datasets(db: Session, media_path: Path, *, exclude_id: int) -> bool:
    target = str(media_path.expanduser().resolve())
    records = db.scalars(select(DatasetRecord).where(DatasetRecord.id != exclude_id)).all()
    for record in records:
        for candidate in _dataset_media_paths(record):
            if str(candidate) == target:
                return True
    return False


def _delete_dataset_storage_files(db: Session, record: DatasetRecord) -> None:
    family_root = _dataset_family_root_from_record(record)
    media_paths = _dataset_media_paths(record)
    manages_shared_layout = _is_relative_to(_dataset_shared_annotation_root(record, ensure=True), family_root)
    for media_path in media_paths:
        if _media_path_referenced_by_other_datasets(db, media_path, exclude_id=record.id):
            continue
        if manages_shared_layout:
            _delete_media_companion_labels(_dataset_shared_annotation_root(record, ensure=True), media_path)
            _delete_shared_media_metadata(record, media_path)
        _delete_media_companion_labels(_dataset_annotation_root(record, ensure=True), media_path)
        _delete_legacy_media_metadata(record, media_path)
        if not _is_relative_to(media_path, family_root) or not media_path.exists() or not media_path.is_file():
            continue
        try:
            media_path.unlink()
        except OSError:
            continue
        _cleanup_empty_parent_dirs(media_path.parent, family_root)

    workspace_root = _dataset_annotation_root(record, ensure=False)
    if workspace_root.exists() and workspace_root.is_dir():
        shutil.rmtree(workspace_root, ignore_errors=True)

    siblings = db.scalars(select(DatasetRecord).where(DatasetRecord.id != record.id)).all()
    has_family_siblings = any(_dataset_family_root_from_record(item) == family_root for item in siblings)
    if not has_family_siblings and family_root.exists() and family_root.is_dir():
        shutil.rmtree(family_root, ignore_errors=True)


def _delete_shared_media_metadata(record: DatasetRecord, media_path: Path) -> None:
    for candidate in {_media_metadata_path(record, media_path)}:
        if not candidate.exists() or not candidate.is_file():
            continue
        try:
            candidate.unlink()
        except OSError:
            continue


def _delete_legacy_media_metadata(record: DatasetRecord, media_path: Path) -> None:
    for candidate in {_legacy_media_metadata_path(record, media_path)}:
        if not candidate.exists() or not candidate.is_file():
            continue
        try:
            candidate.unlink()
        except OSError:
            continue


def _path_slug(value: str) -> str:
    return sub(r"[^a-z0-9_-]+", "_", value.lower()).strip("_") or "dataset"


def _percent(value: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((value / total) * 100, 1)
