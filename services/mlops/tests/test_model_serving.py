"""Tests for model serving infrastructure (loader/cache/hot-reload)."""

import pickle
import time
from pathlib import Path
import tempfile

from src.serving.model_cache import ModelCache


def test_model_cache_loads_pkl_and_caches():
    cache = ModelCache(max_models=2)

    with tempfile.TemporaryDirectory() as td:
        model_path = Path(td) / "model.pkl"

        with model_path.open("wb") as f:
            pickle.dump({"v": 1}, f)

        first = cache.get(model_path)
        second = cache.get(model_path)

        assert first.model["v"] == 1
        assert second.model["v"] == 1
        assert first.model is second.model


def test_model_cache_hot_reload_on_update():
    cache = ModelCache(max_models=2)

    with tempfile.TemporaryDirectory() as td:
        model_path = Path(td) / "model.pkl"

        with model_path.open("wb") as f:
            pickle.dump({"v": 1}, f)

        first = cache.get(model_path)
        assert first.model["v"] == 1

        time.sleep(0.01)
        with model_path.open("wb") as f:
            pickle.dump({"v": 2}, f)

        updated = cache.get(model_path)
        assert updated.model["v"] == 2
        assert updated.mtime_ns != first.mtime_ns

