from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dashboard_seed import Experiment
from app.models.workspace import DatasetEventRecord, DatasetRecord, ProjectRecord
from app.schemas.dashboard import (
    ActivityItem,
    DashboardPayload,
    DistributionItem,
    ExperimentRow,
    QuickActionItem,
    RecentDatasetItem,
    ResourceUsageCard,
    SparklinePoint,
    SummaryCard,
    TrainingOverviewItem,
    WorkspaceSummary,
)
from app.services.dataset_scanner import list_dataset_classes
from app.services.workspace_service import ensure_seed_data


def get_dashboard_payload(
    db: Session | None = None,
    *,
    dataset_id: int | None = None,
    project_id: int | None = None,
) -> DashboardPayload:
    projects: list[ProjectRecord] = []
    datasets: list[DatasetRecord] = []
    current_project: ProjectRecord | None = None
    current_dataset: DatasetRecord | None = None
    scoped_datasets: list[DatasetRecord] = []
    experiment_rows: list[Experiment] = []
    activity_rows: list[DatasetEventRecord] = []

    if db is not None:
        ensure_seed_data(db)
        projects = db.scalars(select(ProjectRecord).order_by(ProjectRecord.updated_at.desc())).all()
        datasets = db.scalars(select(DatasetRecord).order_by(DatasetRecord.updated_at.desc())).all()
        current_project = _select_project(db, projects, project_id, dataset_id, datasets)
        scoped_datasets = [item for item in datasets if current_project is None or item.project_id == current_project.id]
        current_dataset = _select_dataset(db, scoped_datasets or datasets, dataset_id)
        if current_dataset is not None and current_project is None and current_dataset.project_id is not None:
            current_project = next((item for item in projects if item.id == current_dataset.project_id), None)
            scoped_datasets = [item for item in datasets if item.project_id == current_project.id] if current_project else datasets

        experiment_rows = _list_experiments(db, current_dataset)
        activity_rows = _list_activity_rows(db, current_dataset, scoped_datasets or datasets)
    else:
        scoped_datasets = datasets

    scoped_datasets = scoped_datasets or datasets
    total_images = current_dataset.image_count if current_dataset else sum(item.image_count for item in scoped_datasets)
    total_videos = current_dataset.video_count if current_dataset else sum(item.video_count for item in scoped_datasets)
    total_classes = current_dataset.class_count if current_dataset else sum(item.class_count for item in scoped_datasets)
    total_annotations = current_dataset.annotation_count if current_dataset else sum(item.annotation_count for item in scoped_datasets)
    ready_datasets = sum(1 for item in scoped_datasets if item.status.lower() == "ready")

    return DashboardPayload(
        workspace=WorkspaceSummary(
            project_name=current_project.name if current_project else "No project",
            dataset_name=f"{current_dataset.name} {current_dataset.version}" if current_dataset else "No dataset",
            dataset_status=current_dataset.status if current_dataset else "Idle",
        ),
        cards=[
            SummaryCard(
                id="datasets",
                title="Datasets",
                value=str(len(scoped_datasets)),
                subtitle=f"{ready_datasets} ready for training" if datasets else "No datasets yet",
                action_label="Open",
            ),
            SummaryCard(
                id="images",
                title="Images",
                value=_format_count(total_images),
                subtitle=f"{_format_count(total_videos)} videos available" if total_videos else "Across imported sources",
                action_label="Open",
            ),
            SummaryCard(
                id="classes",
                title="Classes",
                value=_format_count(total_classes),
                subtitle="Indexed object classes" if total_classes else "No classes yet",
                action_label="Open",
            ),
            SummaryCard(
                id="annotations",
                title="Labels",
                value=_format_count(total_annotations),
                subtitle="Annotation files detected" if total_annotations else "No labels yet",
                action_label="Open",
            ),
            SummaryCard(id="models", title="Models", value="0", subtitle="No trained models", action_label="Open"),
            SummaryCard(
                id="experiments",
                title="Experiments",
                value=str(len(experiment_rows)),
                subtitle="Tracked runs for this dataset" if experiment_rows else "No runs yet",
                action_label="Open",
            ),
            SummaryCard(id="best-map", title="Best mAP@0.5", value="N/A", subtitle="No evaluations", action_label="Open"),
            SummaryCard(
                id="training-jobs",
                title="Training Jobs",
                value="0",
                subtitle="No active jobs",
                action_label="Open",
            ),
        ],
        experiments=[_experiment_item(item, current_dataset) for item in experiment_rows[:5]],
        training_overview=_training_overview(current_dataset),
        resource_usage=_resource_usage(current_dataset),
        metric_points=_metric_points(current_dataset),
        class_total=total_classes,
        class_distribution=_class_distribution(current_dataset, scoped_datasets),
        recent_datasets=[
            RecentDatasetItem(
                name=f"{item.name} {item.version}",
                updated_label=f"Updated {_relative_time(item.updated_at)}",
                version=item.version,
            )
            for item in scoped_datasets[:4]
        ],
        activity=[_activity_item(item, scoped_datasets) for item in activity_rows[:10]],
        quick_actions=[
            QuickActionItem(id="import-dataset", title="Import Dataset", subtitle="Analyze folder and create manifest", icon="upload"),
            QuickActionItem(id="start-training", title="Start Training", subtitle="Open training workspace", icon="play"),
            QuickActionItem(id="new-experiment", title="New Experiment", subtitle="Create run configuration", icon="flask"),
            QuickActionItem(id="create-pipeline", title="Create Pipeline", subtitle="Compose reusable workflow", icon="workflow"),
        ],
    )


def _select_project(
    db: Session,
    projects: list[ProjectRecord],
    project_id: int | None,
    dataset_id: int | None,
    datasets: list[DatasetRecord],
) -> ProjectRecord | None:
    if project_id is not None:
        return db.get(ProjectRecord, project_id)
    if dataset_id is not None:
        dataset = db.get(DatasetRecord, dataset_id)
        if dataset is not None and dataset.project_id is not None:
            return db.get(ProjectRecord, dataset.project_id)
    if datasets:
        dataset_project_id = datasets[0].project_id
        if dataset_project_id is not None:
            return next((item for item in projects if item.id == dataset_project_id), None)
    return projects[0] if projects else None


def _select_dataset(db: Session, datasets: list[DatasetRecord], dataset_id: int | None) -> DatasetRecord | None:
    if dataset_id is not None:
        record = db.get(DatasetRecord, dataset_id)
        if record is not None:
            return record
    return datasets[0] if datasets else None


def _list_experiments(db: Session, current_dataset: DatasetRecord | None) -> list[Experiment]:
    query = select(Experiment).order_by(Experiment.id.desc())
    rows = db.scalars(query).all()
    if current_dataset is None:
        return rows

    dataset_key = current_dataset.name.lower()
    dataset_label = f"{current_dataset.name} {current_dataset.version}".lower()
    return [
        row
        for row in rows
        if row.dataset_name.lower() in {dataset_key, dataset_label} or dataset_key in row.dataset_name.lower()
    ]


def _list_activity_rows(
    db: Session,
    current_dataset: DatasetRecord | None,
    scoped_datasets: list[DatasetRecord],
) -> list[DatasetEventRecord]:
    if current_dataset is not None:
        return db.scalars(
            select(DatasetEventRecord)
            .where(DatasetEventRecord.dataset_id == current_dataset.id)
            .order_by(DatasetEventRecord.created_at.desc(), DatasetEventRecord.id.desc())
        ).all()

    dataset_ids = [item.id for item in scoped_datasets]
    if not dataset_ids:
        return []

    return db.scalars(
        select(DatasetEventRecord)
        .where(DatasetEventRecord.dataset_id.in_(dataset_ids))
        .order_by(DatasetEventRecord.created_at.desc(), DatasetEventRecord.id.desc())
    ).all()


def _class_distribution(current_dataset: DatasetRecord | None, datasets: list[DatasetRecord]) -> list[DistributionItem]:
    if current_dataset is not None:
        for source_path in (current_dataset.storage_path, current_dataset.source_path):
            if not source_path:
                continue
            classes = list_dataset_classes(source_path)
            if classes:
                total_instances = sum(item.instances for item in classes)
                divisor = total_instances or len(classes)
                return [
                    DistributionItem(
                        name=item.name,
                        value=round(((item.instances or 1) / divisor) * 100, 1),
                        color=item.color,
                    )
                    for item in classes[:6]
                ]

    total = sum(item.class_count for item in datasets)
    if total <= 0:
        return []

    colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#60a5fa", "#34d399"]
    rows = sorted(datasets, key=lambda item: item.class_count, reverse=True)[:6]
    return [
        DistributionItem(
            name=f"{item.name} {item.version}",
            value=round((item.class_count / total) * 100, 1),
            color=colors[index % len(colors)],
        )
        for index, item in enumerate(rows)
        if item.class_count > 0
    ]


def _training_overview(current_dataset: DatasetRecord | None) -> list[TrainingOverviewItem]:
    if current_dataset is None or current_dataset.image_count <= 0:
        return []

    labeled_progress = round((current_dataset.labeled_count / current_dataset.image_count) * 100) if current_dataset.image_count else 0
    if labeled_progress <= 0:
        return []

    verified_progress = round((current_dataset.verified_count / current_dataset.image_count) * 100) if current_dataset.image_count else 0
    return [
        TrainingOverviewItem(
            title="Dataset Labeling",
            run=f"{current_dataset.name} {current_dataset.version}",
            progress_label=f"{current_dataset.labeled_count}/{current_dataset.image_count} labeled",
            progress=labeled_progress,
            eta="In progress",
            eta_label="Coverage",
        ),
        TrainingOverviewItem(
            title="Verification",
            run=f"{current_dataset.verified_count} verified",
            progress_label=f"{current_dataset.verified_count}/{current_dataset.image_count} checked",
            progress=verified_progress,
            eta=current_dataset.status,
            eta_label="Dataset status",
        ),
    ]


def _resource_usage(current_dataset: DatasetRecord | None) -> list[ResourceUsageCard]:
    if current_dataset is None or current_dataset.image_count <= 0:
        return []

    labeled_share = round((current_dataset.labeled_count / current_dataset.image_count) * 100, 1) if current_dataset.image_count else 0.0
    verified_share = round((current_dataset.verified_count / current_dataset.image_count) * 100, 1) if current_dataset.image_count else 0.0
    annotation_density = round((current_dataset.annotation_count / max(current_dataset.image_count, 1)) * 10, 1)
    return [
        ResourceUsageCard(
            label="Labeled",
            value=f"{labeled_share:.1f}%",
            color="#2F6DF6",
            points=_spark_points([8, 18, 24, 31, 38, 43, labeled_share]),
        ),
        ResourceUsageCard(
            label="Verified",
            value=f"{verified_share:.1f}%",
            color="#8B5CF6",
            points=_spark_points([4, 8, 11, 15, 18, 22, verified_share]),
        ),
        ResourceUsageCard(
            label="Label Density",
            value=f"{annotation_density:.1f}/img",
            color="#22C55E",
            points=_spark_points([1.2, 2.4, 3.1, 4.2, 5.0, 6.1, annotation_density]),
        ),
    ]


def _metric_points(current_dataset: DatasetRecord | None) -> list[dict[str, float | int]]:
    if current_dataset is None or current_dataset.image_count <= 0:
        return []

    labeled_share = round(current_dataset.labeled_count / current_dataset.image_count, 3) if current_dataset.image_count else 0.0
    verified_share = round(current_dataset.verified_count / current_dataset.image_count, 3) if current_dataset.image_count else 0.0
    steps = [0.08, 0.19, 0.33, 0.46, 0.58, 0.69, 0.78, 0.86, 0.93, 1.0]
    points: list[dict[str, float | int]] = []
    for index, share in enumerate(steps, start=1):
        points.append(
            {
                "epoch": index * 5,
                "map50": round(min(labeled_share * share + 0.06, 0.99), 3),
                "map5095": round(min(verified_share * share + 0.03, 0.93), 3),
            }
        )
    return points


def _experiment_item(item: Experiment, current_dataset: DatasetRecord | None) -> ExperimentRow:
    return ExperimentRow(
        run=item.run_name,
        model=item.model_name,
        dataset=current_dataset.name if current_dataset else item.dataset_name,
        metric=item.metric_value,
        status=item.status.title(),
        time_label=f"Run {item.id}",
    )


def _activity_item(record: DatasetEventRecord, datasets: list[DatasetRecord]) -> ActivityItem:
    dataset_name = next((f"{item.name} {item.version}" for item in datasets if item.id == record.dataset_id), "Dataset")
    message = record.description.strip() if record.description else record.title
    if dataset_name not in message:
        message = f"{dataset_name}: {message}"
    return ActivityItem(
        time_label=record.created_at.strftime("%H:%M:%S"),
        level=_event_level(record),
        message=message,
    )


def _event_level(record: DatasetEventRecord) -> str:
    title = record.title.lower()
    if "deleted" in title:
        return "WARNING"
    if record.event_type.lower() in {"error", "failed"}:
        return "ERROR"
    return "INFO"


def _spark_points(values: list[float]) -> list[SparklinePoint]:
    return [SparklinePoint(name=str(index + 1), value=round(value, 2)) for index, value in enumerate(values)]


def _format_count(value: int) -> str:
    if value >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if value >= 1_000:
        return f"{value / 1_000:.0f}K"
    return str(value)


def _relative_time(value: datetime) -> str:
    seconds = max(int((datetime.utcnow() - value).total_seconds()), 0)
    minutes = seconds // 60
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hours ago"
    days = hours // 24
    return f"{days} days ago"
