"""AutoLabel service — run YOLO inference on dataset images and save annotations."""

from __future__ import annotations

import logging
from pathlib import Path

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.workspace import DatasetRecord
from app.schemas.workspace import DatasetAnnotationPayload, DatasetAnnotationShape
from app.services.workspace_service import (
    save_dataset_annotation,
    _collect_media_files,
    _dataset_media_root,
    _read_dataset_class_names,
    _write_class_names,
    _dataset_shared_annotation_root,
    _touch_scan_counts,
)

logger = logging.getLogger(__name__)

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

DEFAULT_MODEL = "yolov8n.pt"


class AutoLabelRequest(BaseModel):
    dataset_id: int
    model_path: str = DEFAULT_MODEL
    confidence: float = Field(default=0.25, ge=0.01, le=1.0)
    iou_threshold: float = Field(default=0.45, ge=0.01, le=1.0)
    max_detections: int = Field(default=300, ge=1, le=10000)
    skip_annotated: bool = True
    device: str = "auto"


class AutoLabelResult(BaseModel):
    total_images: int = 0
    processed: int = 0
    skipped: int = 0
    total_detections: int = 0
    classes_added: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


def run_autolabel(db: Session, request: AutoLabelRequest) -> AutoLabelResult:
    """Run YOLO model on all images in the dataset and save annotations in YOLO format."""
    record = db.get(DatasetRecord, request.dataset_id)
    if record is None:
        raise LookupError(f"Dataset {request.dataset_id} not found")

    media_root = _dataset_media_root(record, ensure=True)
    all_media = _collect_media_files(media_root)
    images = [p for p in all_media if p.suffix.lower() in IMAGE_SUFFIXES]

    result = AutoLabelResult(total_images=len(images))

    if not images:
        return result

    # Determine which images already have annotations (if skip_annotated)
    annotated_stems: set[str] = set()
    if request.skip_annotated:
        annotation_root = _dataset_shared_annotation_root(record, ensure=True)
        labels_dir = annotation_root / "labels"
        if labels_dir.exists():
            for txt_file in labels_dir.rglob("*.txt"):
                annotated_stems.add(txt_file.stem.lower())

    # Load YOLO model
    try:
        from ultralytics import YOLO
        device = None if request.device == "auto" else request.device
        model = YOLO(request.model_path)
    except Exception as exc:
        result.errors.append(f"Failed to load model: {exc}")
        return result

    # Get YOLO model class names (COCO classes for pretrained models)
    model_class_names: list[str] = []
    if hasattr(model, "names") and model.names:
        if isinstance(model.names, dict):
            model_class_names = [model.names[i] for i in sorted(model.names.keys())]
        else:
            model_class_names = list(model.names)

    # Read existing dataset classes and build mapping
    existing_classes = _read_dataset_class_names(record)
    class_to_id: dict[str, int] = {name.lower(): idx for idx, name in enumerate(existing_classes)}
    new_classes: list[str] = []

    for model_cls in model_class_names:
        if model_cls.lower() not in class_to_id:
            new_id = len(existing_classes) + len(new_classes)
            class_to_id[model_cls.lower()] = new_id
            new_classes.append(model_cls)

    # Save updated class list
    if new_classes:
        all_classes = existing_classes + new_classes
        classes_root = _dataset_media_root(record, ensure=True)
        _write_class_names(str(classes_root), all_classes)
        result.classes_added = new_classes

    # Process images
    for image_path in images:
        stem = image_path.stem.lower()

        if request.skip_annotated and stem in annotated_stems:
            result.skipped += 1
            continue

        try:
            predictions = model.predict(
                source=str(image_path),
                conf=request.confidence,
                iou=request.iou_threshold,
                max_det=request.max_detections,
                device=device,
                verbose=False,
            )

            annotations: list[DatasetAnnotationShape] = []
            for pred in predictions:
                if pred.boxes is None:
                    continue
                boxes = pred.boxes
                img_w = pred.orig_shape[1]
                img_h = pred.orig_shape[0]

                for i in range(len(boxes)):
                    # Get box in xyxy format
                    x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                    cls_idx = int(boxes.cls[i].item())

                    # Get class name from model
                    cls_name = model_class_names[cls_idx] if cls_idx < len(model_class_names) else f"class_{cls_idx}"
                    mapped_id = class_to_id.get(cls_name.lower(), cls_idx)

                    # Convert to YOLO normalized format (x_center, y_center, width, height)
                    x_center = ((x1 + x2) / 2) / img_w
                    y_center = ((y1 + y2) / 2) / img_h
                    w = (x2 - x1) / img_w
                    h = (y2 - y1) / img_h

                    # Clamp to [0, 1]
                    x_center = max(0.0, min(1.0, x_center))
                    y_center = max(0.0, min(1.0, y_center))
                    w = max(0.0, min(1.0, w))
                    h = max(0.0, min(1.0, h))

                    annotations.append(DatasetAnnotationShape(
                        class_id=mapped_id,
                        x_center=x_center,
                        y_center=y_center,
                        width=w,
                        height=h,
                    ))

            # Save annotations using existing infrastructure
            payload = DatasetAnnotationPayload(
                path=str(image_path),
                annotations=annotations,
            )
            save_dataset_annotation(db, request.dataset_id, payload)
            result.total_detections += len(annotations)
            result.processed += 1

        except Exception as exc:
            logger.warning("AutoLabel error for %s: %s", image_path.name, exc)
            result.errors.append(f"{image_path.name}: {exc}")

    # Update dataset scan counts
    _touch_scan_counts(record)
    db.commit()

    return result
