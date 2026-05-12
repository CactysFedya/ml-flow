from __future__ import annotations

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="ready")


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    version: Mapped[str] = mapped_column(String(32), default="v1.0")
    status: Mapped[str] = mapped_column(String(32), default="ready")


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    run_name: Mapped[str] = mapped_column(String(48), unique=True)
    model_name: Mapped[str] = mapped_column(String(120))
    dataset_name: Mapped[str] = mapped_column(String(160))
    metric_value: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="completed")
