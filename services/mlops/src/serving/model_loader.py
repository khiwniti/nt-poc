"""Model loading utilities for serving (.h5/.pkl/.joblib)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Literal, Optional
import json
import logging
import pickle

import joblib

logger = logging.getLogger(__name__)

ModelFormat = Literal["keras_h5", "pickle"]


@dataclass(frozen=True)
class ModelArtifact:
    """Loaded model artifact with metadata and mtime tracking."""

    model: Any
    path: Path
    format: ModelFormat
    mtime_ns: int
    loaded_at: datetime
    metadata: Dict[str, Any]


def _load_metadata_for_model(model_path: Path) -> Dict[str, Any]:
    metadata_path = model_path.parent / f"{model_path.stem}_metadata.json"
    if not metadata_path.exists():
        return {}
    try:
        return json.loads(metadata_path.read_text())
    except Exception:
        logger.exception("Failed to load metadata from %s", metadata_path)
        return {}


def _infer_format(path: Path) -> ModelFormat:
    suffix = path.suffix.lower()
    if suffix in {".h5", ".keras"}:
        return "keras_h5"
    if suffix in {".pkl", ".pickle", ".joblib"}:
        return "pickle"
    raise ValueError(f"Unsupported model format: {path.name}")


def load_model_from_file(model_path: str | Path) -> ModelArtifact:
    """Load a model from disk with best-effort metadata loading."""
    path = Path(model_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")

    model_format = _infer_format(path)
    mtime_ns = path.stat().st_mtime_ns
    loaded_at = datetime.now(timezone.utc)
    metadata = _load_metadata_for_model(path)

    if model_format == "keras_h5":
        try:
            from tensorflow import keras
        except Exception as e:  # pragma: no cover
            raise RuntimeError("TensorFlow/Keras not available for .h5 loading") from e
        model = keras.models.load_model(str(path))
        return ModelArtifact(
            model=model,
            path=path,
            format=model_format,
            mtime_ns=mtime_ns,
            loaded_at=loaded_at,
            metadata=metadata,
        )

    # "pickle" (joblib/pkl)
    try:
        model = joblib.load(path)
    except Exception:
        with path.open("rb") as f:
            model = pickle.load(f)

    return ModelArtifact(
        model=model,
        path=path,
        format=model_format,
        mtime_ns=mtime_ns,
        loaded_at=loaded_at,
        metadata=metadata,
    )

