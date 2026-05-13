"""Training service — run YOLO training on exported dataset and update metrics."""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path

from app.db.session import SessionLocal
from app.models.training import ModelRecord, TrainingRun

logger = logging.getLogger(__name__)

_active_threads: dict[int, threading.Thread] = {}
_stop_flags: dict[int, threading.Event] = {}


def start_training(run_id: int, data_yaml_path: str) -> None:
    """Launch YOLO training in a background thread."""
    if run_id in _active_threads and _active_threads[run_id].is_alive():
        raise RuntimeError(f"Training run {run_id} is already running")

    stop_event = threading.Event()
    _stop_flags[run_id] = stop_event
    thread = threading.Thread(target=_training_worker, args=(run_id, data_yaml_path, stop_event), daemon=True)
    _active_threads[run_id] = thread
    thread.start()


def stop_training(run_id: int) -> bool:
    """Signal a running training to stop."""
    event = _stop_flags.get(run_id)
    if event is None:
        return False
    event.set()
    return True


def is_training_active(run_id: int) -> bool:
    thread = _active_threads.get(run_id)
    return thread is not None and thread.is_alive()


def _training_worker(run_id: int, data_yaml_path: str, stop_event: threading.Event) -> None:
    """Run YOLO training and update the DB row with metrics after each epoch."""
    db = SessionLocal()
    try:
        row = db.get(TrainingRun, run_id)
        if row is None:
            return

        row.status = "Running"
        db.commit()

        from ultralytics import YOLO

        model_name = row.model_name
        if not model_name.endswith(".pt"):
            model_name = model_name + ".pt"

        model = YOLO(model_name.lower())

        device = None if row.device == "auto" else row.device
        start_time = time.time()

        results = model.train(
            data=data_yaml_path,
            epochs=row.epochs,
            batch=row.batch_size,
            imgsz=row.image_size,
            optimizer=row.optimizer,
            lr0=row.learning_rate,
            device=device,
            verbose=False,
            exist_ok=True,
            project=str(Path(data_yaml_path).parent / "runs"),
            name=f"run_{run_id}",
        )

        # Update final metrics
        db.refresh(row)
        if stop_event.is_set():
            row.status = "Stopped"
        else:
            row.status = "Completed"
            row.current_epoch = row.epochs

        elapsed = int(time.time() - start_time)
        row.elapsed_seconds = elapsed

        # Extract metrics from training results
        if results is not None and hasattr(results, "results_dict"):
            rd = results.results_dict
            row.best_map50 = rd.get("metrics/mAP50(B)", 0.0)
            row.best_map50_95 = rd.get("metrics/mAP50-95(B)", 0.0)
            row.precision = rd.get("metrics/precision(B)", 0.0)
            row.recall = rd.get("metrics/recall(B)", 0.0)
            row.box_loss = rd.get("train/box_loss", 0.0)
            row.obj_loss = rd.get("train/dfl_loss", 0.0)
            row.cls_loss = rd.get("train/cls_loss", 0.0)

        db.commit()

        # Auto-register the trained model
        best_pt = Path(data_yaml_path).parent / "runs" / f"run_{run_id}" / "weights" / "best.pt"
        if best_pt.exists():
            model_record = ModelRecord(
                project_id=row.project_id,
                training_run_id=row.id,
                name=f"{row.model_name} — {row.name}",
                model_type="Object Detection",
                architecture=row.model_name,
                framework="PyTorch",
                dataset_name=f"Dataset #{row.dataset_id}" if row.dataset_id else "",
                status="Ready",
                version="v1.0.0",
                file_path=str(best_pt),
                file_size_bytes=best_pt.stat().st_size,
                map50=row.best_map50,
                map50_95=row.best_map50_95,
                precision=row.precision,
                recall=row.recall,
                f1_score=(2 * row.precision * row.recall / (row.precision + row.recall)) if (row.precision + row.recall) > 0 else 0.0,
            )
            db.add(model_record)
            db.commit()

    except Exception as exc:
        logger.exception("Training run %d failed: %s", run_id, exc)
        try:
            db.refresh(row)
            row.status = "Failed"
            row.elapsed_seconds = int(time.time() - start_time) if "start_time" in dir() else 0
            db.commit()
        except Exception:
            pass
    finally:
        _stop_flags.pop(run_id, None)
        _active_threads.pop(run_id, None)
        db.close()
