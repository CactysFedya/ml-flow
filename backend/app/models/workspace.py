from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectRecord(Base):
    __tablename__ = "project_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    task: Mapped[str] = mapped_column(String(120), default="Object detection and classification")
    status: Mapped[str] = mapped_column(String(32), default="Active")
    owner: Mapped[str] = mapped_column(String(80), default="Admin")
    storage_path: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("project_records.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    version: Mapped[str] = mapped_column(String(32), default="v1.0")
    topic: Mapped[str] = mapped_column(String(120), default="Custom")
    task: Mapped[str] = mapped_column(String(80), default="Object Detection")
    status: Mapped[str] = mapped_column(String(32), default="Ready")
    format: Mapped[str] = mapped_column(String(32), default="YOLO")
    source_path: Mapped[str] = mapped_column(String(500), default="")
    storage_path: Mapped[str] = mapped_column(String(500), default="")
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    video_count: Mapped[int] = mapped_column(Integer, default=0)
    annotation_count: Mapped[int] = mapped_column(Integer, default=0)
    class_count: Mapped[int] = mapped_column(Integer, default=0)
    train_count: Mapped[int] = mapped_column(Integer, default=0)
    val_count: Mapped[int] = mapped_column(Integer, default=0)
    test_count: Mapped[int] = mapped_column(Integer, default=0)
    labeled_count: Mapped[int] = mapped_column(Integer, default=0)
    verified_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class DatasetEventRecord(Base):
    __tablename__ = "dataset_event_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("dataset_records.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40), default="updated")
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(80), default="Admin")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class DatasetSourceRecord(Base):
    __tablename__ = "dataset_source_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("dataset_records.id"), index=True)
    name: Mapped[str] = mapped_column(String(180), default="Source")
    source_type: Mapped[str] = mapped_column(String(40), default="folder")
    source_path: Mapped[str] = mapped_column(String(500), default="")
    target_path: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(32), default="Ready")
    split_policy: Mapped[str] = mapped_column(String(80), default="Auto")
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    video_count: Mapped[int] = mapped_column(Integer, default=0)
    annotation_count: Mapped[int] = mapped_column(Integer, default=0)
    class_count: Mapped[int] = mapped_column(Integer, default=0)
    frame_count: Mapped[int] = mapped_column(Integer, default=0)
    train_count: Mapped[int] = mapped_column(Integer, default=0)
    val_count: Mapped[int] = mapped_column(Integer, default=0)
    test_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)
