from __future__ import annotations

from pydantic import BaseModel


class WorkspaceSummary(BaseModel):
    project_name: str
    dataset_name: str
    dataset_status: str


class SummaryCard(BaseModel):
    id: str
    title: str
    value: str
    subtitle: str
    action_label: str


class ExperimentRow(BaseModel):
    run: str
    model: str
    dataset: str
    metric: float
    status: str
    time_label: str


class TrainingOverviewItem(BaseModel):
    title: str
    run: str
    progress_label: str
    progress: int
    eta: str
    eta_label: str


class SparklinePoint(BaseModel):
    name: str
    value: float


class ResourceUsageCard(BaseModel):
    label: str
    value: str
    color: str
    points: list[SparklinePoint]


class MetricPoint(BaseModel):
    epoch: int
    map50: float
    map5095: float


class DistributionItem(BaseModel):
    name: str
    value: float
    color: str


class RecentDatasetItem(BaseModel):
    name: str
    updated_label: str
    version: str


class ActivityItem(BaseModel):
    time_label: str
    level: str
    message: str


class QuickActionItem(BaseModel):
    id: str
    title: str
    subtitle: str
    icon: str


class DashboardPayload(BaseModel):
    workspace: WorkspaceSummary
    cards: list[SummaryCard]
    experiments: list[ExperimentRow]
    training_overview: list[TrainingOverviewItem]
    resource_usage: list[ResourceUsageCard]
    metric_points: list[MetricPoint]
    class_total: int
    class_distribution: list[DistributionItem]
    recent_datasets: list[RecentDatasetItem]
    activity: list[ActivityItem]
    quick_actions: list[QuickActionItem]
