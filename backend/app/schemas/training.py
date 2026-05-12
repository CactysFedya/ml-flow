from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class TrainingRunCreate(BaseModel):
    name: str = Field(default="", max_length=200)
    model_name: str = "YOLOv8s"
    dataset_id: int | None = None
    project_id: int | None = None
    epochs: int = Field(default=50, ge=1)
    batch_size: int = Field(default=16, ge=1)
    image_size: int = Field(default=640, ge=32)
    optimizer: str = "SGD"
    learning_rate: float = Field(default=0.01, gt=0)
    device: str = "auto"


class TrainingRunItem(BaseModel):
    id: int
    project_id: int | None
    dataset_id: int | None
    name: str
    model_name: str
    status: str
    epochs: int
    current_epoch: int
    batch_size: int
    image_size: int
    optimizer: str
    learning_rate: float
    best_map50: float
    best_map50_95: float
    precision: float
    recall: float
    box_loss: float
    obj_loss: float
    cls_loss: float
    device: str
    elapsed_seconds: int
    created_at: datetime
    updated_at: datetime


class TrainingRunUpdate(BaseModel):
    status: str | None = None
    current_epoch: int | None = None
    best_map50: float | None = None
    best_map50_95: float | None = None
    precision: float | None = None
    recall: float | None = None
    box_loss: float | None = None
    obj_loss: float | None = None
    cls_loss: float | None = None
    elapsed_seconds: int | None = None


class ModelCreate(BaseModel):
    name: str = Field(default="", max_length=200)
    model_type: str = "Object Detection"
    architecture: str = "YOLOv8s"
    framework: str = "PyTorch"
    dataset_name: str = ""
    project_id: int | None = None
    training_run_id: int | None = None
    version: str = "v1.0.0"
    file_path: str = ""


class ModelItem(BaseModel):
    id: int
    project_id: int | None
    training_run_id: int | None
    name: str
    model_type: str
    architecture: str
    framework: str
    dataset_name: str
    status: str
    version: str
    file_path: str
    file_size_bytes: int
    map50: float
    map50_95: float
    precision: float
    recall: float
    f1_score: float
    created_at: datetime
    updated_at: datetime


class ModelUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    version: str | None = None
    map50: float | None = None
    map50_95: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1_score: float | None = None


class PipelineCreate(BaseModel):
    name: str = Field(default="", max_length=200)
    description: str = ""
    template: str = "custom"
    project_id: int | None = None


class PipelineItem(BaseModel):
    id: int
    project_id: int | None
    name: str
    description: str
    status: str
    template: str
    total_steps: int
    current_step: int
    created_at: datetime
    updated_at: datetime


class PipelineStepCreate(BaseModel):
    name: str = Field(default="", max_length=200)
    step_type: str = "transform"
    config_json: str = "{}"


class PipelineStepItem(BaseModel):
    id: int
    pipeline_id: int
    step_order: int
    name: str
    step_type: str
    status: str
    config_json: str
    duration_seconds: int
    created_at: datetime


class PipelineRunItem(BaseModel):
    id: int
    pipeline_id: int
    run_number: int
    status: str
    duration_seconds: int
    created_at: datetime


class PipelineDetail(PipelineItem):
    steps: list[PipelineStepItem] = Field(default_factory=list)
    runs: list[PipelineRunItem] = Field(default_factory=list)


class SettingItem(BaseModel):
    key: str
    value: str
    category: str


class SettingUpdate(BaseModel):
    value: str


class SettingsBulkUpdate(BaseModel):
    settings: list[SettingItem] = Field(default_factory=list)
