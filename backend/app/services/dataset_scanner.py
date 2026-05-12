from __future__ import annotations

import os
import json
import re
import struct
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".m4v", ".webm"}
ANNOTATION_SUFFIXES = {".txt", ".json", ".xml", ".yaml", ".yml", ".csv"}
CLASS_NAME_FILES = {"classes.txt", "labels.txt", "names.txt"}
CLASS_COLORS = [
    "#2F6DF6",
    "#8B5CF6",
    "#14B8A6",
    "#F59E0B",
    "#EF4444",
    "#22C55E",
    "#EC4899",
    "#6366F1",
    "#06B6D4",
    "#84CC16",
]
IGNORED_FILENAMES = {".ds_store", "thumbs.db", "media_manifest.json"}


@dataclass(frozen=True)
class ScanResult:
    image_count: int
    video_count: int
    annotation_count: int
    class_count: int
    train_count: int
    val_count: int
    test_count: int
    labeled_count: int
    verified_count: int


@dataclass(frozen=True)
class MediaItemResult:
    id: str
    name: str
    path: str
    kind: str
    split: str
    annotated: bool
    verified: bool
    width: int | None = None
    height: int | None = None


@dataclass(frozen=True)
class ClassItemResult:
    id: str
    name: str
    instances: int
    color: str


def scan_dataset_path(source_path: str) -> ScanResult:
    root = Path(source_path).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Dataset folder does not exist: {source_path}")

    image_count = 0
    video_count = 0
    annotation_count = 0
    train_count = 0
    val_count = 0
    test_count = 0
    verified_count = 0
    image_stems: set[str] = set()
    label_stems: set[str] = set()
    class_names: dict[str, str] = {}
    class_counts: Counter[str] = Counter()

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        current_dir = Path(dirpath)
        lowered_parts = {part.lower() for part in current_dir.parts}

        for filename in sorted(filenames):
            if _is_ignored_filename(filename):
                continue
            path = current_dir / filename
            suffix = path.suffix.lower()
            stem_key = path.stem.lower()

            if suffix in IMAGE_SUFFIXES:
                image_count += 1
                image_stems.add(stem_key)
                if "train" in lowered_parts:
                    train_count += 1
                elif "val" in lowered_parts or "valid" in lowered_parts or "validation" in lowered_parts:
                    val_count += 1
                elif "test" in lowered_parts:
                    test_count += 1
                if "verified" in lowered_parts or "checked" in lowered_parts:
                    verified_count += 1
                continue

            if suffix in VIDEO_SUFFIXES:
                video_count += 1
                continue

            if suffix in ANNOTATION_SUFFIXES:
                annotation_count += 1
                label_stems.add(stem_key)
                _collect_classes(path, class_names, class_counts)

    if image_count and not any((train_count, val_count, test_count)):
        train_count = round(image_count * 0.8)
        val_count = round(image_count * 0.1)
        test_count = max(image_count - train_count - val_count, 0)

    class_count = len(class_names) if class_names else len(class_counts)
    return ScanResult(
        image_count=image_count,
        video_count=video_count,
        annotation_count=annotation_count,
        class_count=class_count,
        train_count=train_count,
        val_count=val_count,
        test_count=test_count,
        labeled_count=len(image_stems & label_stems),
        verified_count=verified_count,
    )


def list_dataset_media(source_path: str, limit: int = 500) -> list[MediaItemResult]:
    root = Path(source_path).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        return []

    label_stems = _collect_label_stems(root)
    media: list[MediaItemResult] = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        current_dir = Path(dirpath)
        lowered_parts = {part.lower() for part in current_dir.parts}
        split = _detect_split(lowered_parts)
        verified = "verified" in lowered_parts or "checked" in lowered_parts

        for filename in sorted(filenames):
            if _is_ignored_filename(filename):
                continue
            path = current_dir / filename
            suffix = path.suffix.lower()
            if suffix not in IMAGE_SUFFIXES and suffix not in VIDEO_SUFFIXES:
                continue
            size = _read_image_size(path) if suffix in IMAGE_SUFFIXES else None

            media.append(
                MediaItemResult(
                    id=str(len(media) + 1),
                    name=filename,
                    path=str(path),
                    kind="video" if suffix in VIDEO_SUFFIXES else "image",
                    split=split,
                    annotated=path.stem.lower() in label_stems,
                    verified=verified,
                    width=size[0] if size else None,
                    height=size[1] if size else None,
                )
            )
            if len(media) >= limit:
                return media

    return media


def list_dataset_media_paths(paths: list[str | Path], limit: int = 500) -> list[MediaItemResult]:
    media: list[MediaItemResult] = []
    label_stems = {
        path.stem.lower()
        for path in (Path(raw).expanduser().resolve() for raw in paths)
        if path.suffix.lower() in ANNOTATION_SUFFIXES
    }

    for raw_path in paths:
        path = Path(raw_path).expanduser().resolve()
        if not path.exists() or not path.is_file() or _is_ignored_filename(path.name):
            continue
        suffix = path.suffix.lower()
        if suffix not in IMAGE_SUFFIXES and suffix not in VIDEO_SUFFIXES:
            continue

        lowered_parts = {part.lower() for part in path.parts}
        split = _detect_split(lowered_parts)
        verified = "verified" in lowered_parts or "checked" in lowered_parts
        size = _read_image_size(path) if suffix in IMAGE_SUFFIXES else None

        media.append(
            MediaItemResult(
                id=str(len(media) + 1),
                name=path.name,
                path=str(path),
                kind="video" if suffix in VIDEO_SUFFIXES else "image",
                split=split,
                annotated=path.stem.lower() in label_stems,
                verified=verified,
                width=size[0] if size else None,
                height=size[1] if size else None,
            )
        )
        if len(media) >= limit:
            break

    return media


def list_dataset_classes(source_path: str) -> list[ClassItemResult]:
    root = Path(source_path).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        return []

    class_names: dict[str, str] = {}
    class_counts: Counter[str] = Counter()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        current_dir = Path(dirpath)
        for filename in sorted(filenames):
            if _is_ignored_filename(filename):
                continue
            path = current_dir / filename
            if path.suffix.lower() in ANNOTATION_SUFFIXES:
                _collect_classes(path, class_names, class_counts)

    keys = set(class_names) | set(class_counts)
    if not keys:
        return []

    def sort_key(value: str) -> tuple[int, int | str]:
        return (0, int(value)) if value.isdigit() else (1, value)

    return [
        ClassItemResult(
            id=key,
            name=class_names.get(key, f"class {key}"),
            instances=class_counts.get(key, 0),
            color=CLASS_COLORS[index % len(CLASS_COLORS)],
        )
        for index, key in enumerate(sorted(keys, key=sort_key))
    ]


def _collect_classes(path: Path, class_names: dict[str, str], class_counts: Counter[str]) -> None:
    name = path.name.lower()
    if name in CLASS_NAME_FILES:
        try:
            for index, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines()):
                value = line.strip()
                if value:
                    class_names[str(index)] = value
        except OSError:
            return
        return

    suffix = path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        _collect_yaml_classes(path, class_names)
        return

    if suffix == ".json":
        _collect_json_classes(path, class_names, class_counts)
        return

    if suffix == ".xml":
        _collect_xml_classes(path, class_names, class_counts)
        return

    if suffix != ".txt":
        return

    try:
        with path.open("r", encoding="utf-8", errors="ignore") as file:
            for index, line in enumerate(file):
                if index > 100:
                    break
                first_token = line.strip().split(" ", 1)[0]
                if first_token.isdigit():
                    class_counts[first_token] += 1
    except OSError:
        return


def _collect_label_stems(root: Path) -> set[str]:
    stems: set[str] = set()
    for dirpath, _, filenames in os.walk(root):
        current_dir = Path(dirpath)
        for filename in filenames:
            if _is_ignored_filename(filename):
                continue
            path = current_dir / filename
            if path.suffix.lower() in ANNOTATION_SUFFIXES:
                stems.add(path.stem.lower())
    return stems


def _is_ignored_filename(filename: str) -> bool:
    lowered = filename.lower()
    return lowered.startswith("._") or lowered in IGNORED_FILENAMES


def _collect_yaml_classes(path: Path, class_names: dict[str, str]) -> None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return

    bracket_match = re.search(r"names\s*:\s*\[(.*?)\]", text, flags=re.IGNORECASE | re.DOTALL)
    if bracket_match:
        values = [item.strip().strip("\"'") for item in bracket_match.group(1).split(",")]
        for index, value in enumerate(value for value in values if value):
            class_names[str(index)] = value
        return

    for key, value in re.findall(r"^\s*(\d+)\s*:\s*['\"]?([^'\"\n#]+)", text, flags=re.MULTILINE):
        class_names[key] = value.strip()


def _collect_json_classes(path: Path, class_names: dict[str, str], class_counts: Counter[str]) -> None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except (OSError, json.JSONDecodeError):
        return

    if isinstance(payload, dict):
        categories = payload.get("categories")
        if isinstance(categories, list):
            for category in categories:
                if isinstance(category, dict) and "id" in category and category.get("name"):
                    class_names[str(category["id"])] = str(category["name"])

        annotations = payload.get("annotations")
        if isinstance(annotations, list):
            for annotation in annotations:
                if isinstance(annotation, dict) and "category_id" in annotation:
                    class_counts[str(annotation["category_id"])] += 1


def _collect_xml_classes(path: Path, class_names: dict[str, str], class_counts: Counter[str]) -> None:
    try:
        tree = ET.parse(path)
    except (OSError, ET.ParseError):
        return

    for object_node in tree.findall(".//object"):
        name_node = object_node.find("name")
        if name_node is not None and name_node.text:
            label = name_node.text.strip()
            if label:
                class_names.setdefault(label, label)
                class_counts[label] += 1


def _read_image_size(path: Path) -> tuple[int, int] | None:
    suffix = path.suffix.lower()
    try:
        if suffix == ".png":
            with path.open("rb") as file:
                header = file.read(24)
            if header.startswith(b"\x89PNG\r\n\x1a\n") and len(header) >= 24:
                width, height = struct.unpack(">II", header[16:24])
                return int(width), int(height)
        if suffix in {".jpg", ".jpeg"}:
            return _read_jpeg_size(path)
    except OSError:
        return None
    return None


def _read_jpeg_size(path: Path) -> tuple[int, int] | None:
    with path.open("rb") as file:
        if file.read(2) != b"\xff\xd8":
            return None
        while True:
            marker_start = file.read(1)
            if not marker_start:
                return None
            if marker_start != b"\xff":
                continue
            marker = file.read(1)
            while marker == b"\xff":
                marker = file.read(1)
            if marker in {b"\xc0", b"\xc1", b"\xc2", b"\xc3", b"\xc5", b"\xc6", b"\xc7", b"\xc9", b"\xca", b"\xcb", b"\xcd", b"\xce", b"\xcf"}:
                file.read(3)
                height, width = struct.unpack(">HH", file.read(4))
                return int(width), int(height)
            length_bytes = file.read(2)
            if len(length_bytes) != 2:
                return None
            length = struct.unpack(">H", length_bytes)[0]
            if length < 2:
                return None
            file.seek(length - 2, os.SEEK_CUR)


def _detect_split(lowered_parts: set[str]) -> str:
    if "train" in lowered_parts:
        return "Train"
    if "val" in lowered_parts or "valid" in lowered_parts or "validation" in lowered_parts:
        return "Val"
    if "test" in lowered_parts:
        return "Test"
    return "Train"
