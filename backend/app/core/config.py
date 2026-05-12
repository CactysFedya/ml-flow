from __future__ import annotations

from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
BACKEND_ROOT = APP_DIR.parent
DATA_DIR = BACKEND_ROOT / "data"
DATABASE_URL = f"sqlite:///{(DATA_DIR / 'mlforge_v2.db').as_posix()}"
