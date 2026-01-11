"""In-memory model caching with hot-reload on file updates."""

from __future__ import annotations

from collections import OrderedDict
from pathlib import Path
from threading import RLock
from typing import Dict, Optional

from .model_loader import ModelArtifact, load_model_from_file


class ModelCache:
    """LRU cache for loaded models keyed by absolute path."""

    def __init__(self, max_models: int = 8):
        if max_models < 1:
            raise ValueError("max_models must be >= 1")
        self._max_models = max_models
        self._lock = RLock()
        self._cache: "OrderedDict[Path, ModelArtifact]" = OrderedDict()

    def get(self, model_path: str | Path, *, force_reload: bool = False) -> ModelArtifact:
        """Get a loaded model; reload automatically if file mtime changed."""
        path = Path(model_path).expanduser().resolve()

        with self._lock:
            existing = self._cache.get(path)
            if existing is not None and not force_reload:
                current_mtime_ns = path.stat().st_mtime_ns
                if existing.mtime_ns == current_mtime_ns:
                    self._cache.move_to_end(path)
                    return existing

            artifact = load_model_from_file(path)
            self._cache[path] = artifact
            self._cache.move_to_end(path)

            while len(self._cache) > self._max_models:
                self._cache.popitem(last=False)

            return artifact

    def invalidate(self, model_path: str | Path) -> None:
        path = Path(model_path).expanduser().resolve()
        with self._lock:
            self._cache.pop(path, None)

    def info(self) -> Dict[str, Dict[str, object]]:
        """Return cache contents for observability/debugging."""
        with self._lock:
            return {
                str(path): {
                    "format": artifact.format,
                    "mtime_ns": artifact.mtime_ns,
                    "loaded_at": artifact.loaded_at.isoformat(),
                }
                for path, artifact in self._cache.items()
            }

