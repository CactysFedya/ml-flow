from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("project_records.id"), nullable=True, index=True)
    dataset_id: Mapped[int | None] = mapped_column(ForeignKey("dataset_records.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    model_name: Mapped[str] = mapped_column(String(120), default="YOLOv8s")
    status: Mapped[str] = mapped_column(String(32), default="Pending")
    epochs: Mapped[int] = mapped_column(Integer, default=50)
    current_epoch: Mapped[int] = mapped_column(Integer, default=0)
    batch_size: Mapped[int] = mapped_column(Integer, default=16)
    image_size: Mapped[int] = mapped_column(Integer, default=640)
    optimizer: Mapped[str] = mapped_column(String(40), default="SGD")
    learning_rate: Mapped[float] = mapped_column(Float, default=0.01)
    best_map50: Mapped[float] = mapped_column(Float, default=0.0)
    best_map50_95: Mapped[float] = mapped_column(Float, default=0.0)
    precision: Mapped[float] = mapped_column(Float, default=0.0)
    recall: Mapped[float] = mapped_column(Float, default=0.0)
    box_loss: Mapped[float] = mapped_column(Float, default=0.0)
    obj_loss: Mapped[float] = mapped_column(Float, default=0.0)
    cls_loss: Mapped[float] = mapped_column(Float, default=0.0)
    device: Mapped[str] = mapped_column(String(120), default="auto")
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class ModelRecord(Base):
    __tablename__ = "model_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("project_records.id"), nullable=True, index=True)
    training_run_id: Mapped[int | None] = mapped_column(ForeignKey("training_runs.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    model_type: Mapped[str] = mapped_column(String(80), default="Object Detection")
    architecture: Mapped[str] = mapped_column(String(120), default="YOLOv8s")
    framework: Mapped[str] = mapped_column(String(60), default="PyTorch")
    dataset_name: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(32), default="Ready")
    version: Mapped[str] = mapped_column(String(32), default="v1.0.0")
    file_path: Mapped[str] = mapped_column(String(500), default="")
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    map50: Mapped[float] = mapped_column(Float, default=0.0)
    map50_95: Mapped[float] = mapped_column(Float, default=0.0)
    precision: Mapped[float] = mapped_column(Float, default=0.0)
    recall: Mapped[float] = mapped_column(Float, default=0.0)
    f1_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class PipelineRecord(Base):
    __tablename__ = "pipeline_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("project_records.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="Idle")
    template: Mapped[str] = mapped_column(String(120), default="custom")
    total_steps: Mapped[int] = mapped_column(Integer, default=0)
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class PipelineStepRecord(Base):
    __tablename__ = "pipeline_step_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pipeline_id: Mapped[int] = mapped_column(ForeignKey("pipeline_records.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(200), default="")
    step_type: Mapped[str] = mapped_column(String(60), default="transform")
    status: Mapped[str] = mapped_column(String(32), default="Pending")
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class PipelineRunRecord(Base):
    __tablename__ = "pipeline_run_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    pipeline_id: Mapped[int] = mapped_column(ForeignKey("pipeline_records.id"), index=True)
    run_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="Running")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class SettingRecord(Base):
    __tablename__ = "setting_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(60), default="general")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)
