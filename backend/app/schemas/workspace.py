from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DatasetStats(BaseModel):
    images: int
    videos: int
    annotations: int
    classes: int
    labeled: int
    verified: int
    labeled_percent: float
    verified_percent: float


class DatasetSplits(BaseModel):
    train: int
    val: int
    test: int


class DatasetItem(BaseModel):
    id: int
    project_id: int | None
    name: str
    version: str
    topic: str
    task: str
    status: str
    format: str
    source_path: str
    storage_path: str
    created_at: datetime
    updated_at: datetime
    stats: DatasetStats
    splits: DatasetSplits


class DatasetMediaItem(BaseModel):
    id: str
    name: str
    path: str
    kind: str
    split: str
    annotated: bool
    verified: bool
    tags: list[str] = Field(default_factory=list)
    preview_url: str | None = None
    width: int | None = None
    height: int | None = None


class DatasetAnnotationShape(BaseModel):
    class_id: int
    x_center: float = Field(ge=0.0, le=1.0)
    y_center: float = Field(ge=0.0, le=1.0)
    width: float = Field(ge=0.0, le=1.0)
    height: float = Field(ge=0.0, le=1.0)


class DatasetAnnotationPayload(BaseModel):
    path: str = Field(min_length=1)
    annotations: list[DatasetAnnotationShape] = Field(default_factory=list)
    verified: bool = False
    tags: list[str] = Field(default_factory=list)


class DatasetAnnotationItem(BaseModel):
    path: str
    label_path: str | None = None
    format: str = "YOLO"
    annotations: list[DatasetAnnotationShape] = Field(default_factory=list)
    verified: bool = False
    tags: list[str] = Field(default_factory=list)


class DatasetTagCatalogPayload(BaseModel):
    tags: list[str] = Field(default_factory=list)


class DatasetTagCatalogItem(BaseModel):
    tags: list[str] = Field(default_factory=list)


class DatasetClassItem(BaseModel):
    id: str
    name: str
    instances: int
    color: str


class DatasetClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class DatasetClassesImport(BaseModel):
    classes: list[str] = Field(default_factory=list)
    mode: str = "append"


class DatasetSplitItem(BaseModel):
    name: str
    images: int
    videos: int
    total: int
    percent: float
    description: str
    color: str
    system: bool = False


class DatasetSplitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = ""


class DatasetEventItem(BaseModel):
    id: int
    dataset_id: int
    event_type: str
    title: str
    description: str
    author: str
    created_at: datetime


class DatasetSourceItem(BaseModel):
    id: int
    dataset_id: int
    name: str
    source_type: str
    source_path: str
    target_path: str
    status: str
    split_policy: str
    images: int
    videos: int
    annotations: int
    classes: int
    frames: int
    train: int
    val: int
    test: int
    notes: str
    created_at: datetime
    updated_at: datetime


class DatasetSourceCreate(BaseModel):
    source_path: str = Field(min_length=1)
    name: str | None = None
    source_type: str = "folder"
    split_policy: str = "Auto"
    copy_assets: bool = True
    extract_video_frames: bool = False
    frame_interval: int = Field(default=30, ge=1)
    notes: str = ""


class DatasetSourceAddSummary(BaseModel):
    dataset: DatasetItem
    source: DatasetSourceItem
    sources: list[DatasetSourceItem]
    warnings: list[str] = Field(default_factory=list)


class DatasetVideoPlanRequest(BaseModel):
    source_path: str = Field(min_length=1)
    frame_interval: int = Field(default=30, ge=1)
    split_policy: str = "Auto"


class DatasetVideoPlanItem(BaseModel):
    name: str
    path: str
    size_bytes: int
    split: str
    duration_seconds: float | None = None
    fps: float | None = None
    total_frames: int | None = None
    estimated_frames: int
    warning: str = ""


class DatasetVideoPlanSummary(BaseModel):
    source_path: str
    video_count: int
    total_size_bytes: int
    total_duration_seconds: float | None = None
    estimated_frames: int
    frame_interval: int
    split_policy: str
    items: list[DatasetVideoPlanItem]
    warnings: list[str] = Field(default_factory=list)


class DatasetFrameExtractionRequest(BaseModel):
    frame_interval: int = Field(default=30, ge=1)


class DatasetFrameExtractionSummary(BaseModel):
    dataset: DatasetItem
    source: DatasetSourceItem
    sources: list[DatasetSourceItem]
    frames_saved: int
    warnings: list[str] = Field(default_factory=list)


class DatasetUploadSummary(BaseModel):
    dataset: DatasetItem
    files_saved: int
    images_saved: int
    videos_saved: int
    frames_saved: int
    assigned_splits: list[str]
    warnings: list[str] = Field(default_factory=list)


class DatasetMediaBulkPayload(BaseModel):
    paths: list[str] = Field(default_factory=list)
    operation: str = Field(min_length=1)
    split: str | None = None
    tags: list[str] = Field(default_factory=list)


class DatasetMediaBulkSummary(BaseModel):
    dataset: DatasetItem
    changed_files: int
    removed_from_version: int = 0
    moved_files: int = 0
    tagged_files: int = 0
    target_split: str = ""
    tags: list[str] = Field(default_factory=list)
    message: str = ""


class DatasetVersionCreate(BaseModel):
    version: str | None = None
    description: str = ""


class DatasetVersionSampleItem(BaseModel):
    path: str
    name: str
    kind: str
    split: str
    annotated: bool
    verified: bool


class DatasetVersionSummary(BaseModel):
    dataset: DatasetItem
    source_count: int
    has_manifest: bool
    manifest_path: str
    tracked_files: int
    missing_files: int
    image_files: int
    video_files: int
    annotated_files: int
    verified_files: int
    sample_files: list[DatasetVersionSampleItem] = Field(default_factory=list)


class DatasetExportSummary(BaseModel):
    dataset_id: int
    version: str
    export_format: str
    export_path: str
    images_exported: int
    labels_exported: int
    skipped_videos: int
    classes: int
    data_yaml_path: str
    classes_path: str


class DatasetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    version: str = "v1.0"
    topic: str = "Custom"
    task: str = "Object Detection"
    format: str = "YOLO"
    source_path: str | None = None
    project_id: int | None = None


class DatasetImport(BaseModel):
    source_path: str = Field(min_length=1)
    name: str | None = None
    version: str = "v1.0"
    topic: str = "Custom"
    task: str = "Object Detection"
    format: str = "YOLO"
    project_id: int | None = None


class DatasetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    version: str | None = None
    topic: str | None = None
    task: str | None = None
    status: str | None = None
    format: str | None = None
    source_path: str | None = None
    storage_path: str | None = None
    project_id: int | None = None


class ProjectSummary(BaseModel):
    id: int
    name: str
    description: str
    task: str
    status: str
    owner: str
    storage_path: str
    created_at: datetime
    updated_at: datetime
    dataset_count: int
    model_count: int
    experiment_count: int
    pipeline_count: int
    image_count: int
    video_count: int
    class_count: int
    storage_size_bytes: int


class ProjectActivityItem(BaseModel):
    id: int
    dataset_id: int
    dataset_name: str
    event_type: str
    title: str
    description: str
    created_at: datetime


class ProjectDetail(ProjectSummary):
    datasets: list[DatasetItem]
    activities: list[ProjectActivityItem] = Field(default_factory=list)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = ""
    task: str = "Object detection and classification"
    storage_path: str = ""


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    task: str | None = None
    status: str | None = None
    owner: str | None = None
    storage_path: str | None = None
