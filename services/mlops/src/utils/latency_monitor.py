"""Inference latency monitoring utilities."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from threading import RLock
from time import perf_counter
from typing import Deque, Dict, Iterable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    if percentile <= 0:
        return float(min(values))
    if percentile >= 100:
        return float(max(values))
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * (percentile / 100.0)
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return float(values_sorted[f])
    d0 = values_sorted[f] * (c - k)
    d1 = values_sorted[c] * (k - f)
    return float(d0 + d1)


@dataclass(frozen=True)
class LatencyStats:
    count: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    max_ms: float


class LatencyMonitor:
    """Thread-safe, in-memory latency monitor with bounded samples."""

    def __init__(self, max_samples_per_path: int = 2000):
        self._lock = RLock()
        self._samples: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=max_samples_per_path))

    def record(self, path: str, latency_ms: float) -> None:
        with self._lock:
            self._samples[path].append(float(latency_ms))

    def stats(self, path: Optional[str] = None) -> LatencyStats:
        with self._lock:
            if path is None:
                values = [v for dq in self._samples.values() for v in dq]
            else:
                values = list(self._samples.get(path, ()))

        return LatencyStats(
            count=len(values),
            p50_ms=_percentile(values, 50),
            p95_ms=_percentile(values, 95),
            p99_ms=_percentile(values, 99),
            max_ms=float(max(values)) if values else 0.0,
        )

    def paths(self) -> list[str]:
        with self._lock:
            return sorted(self._samples.keys())


class LatencyMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware that records request latency for selected path prefixes."""

    def __init__(self, app, monitor: LatencyMonitor, include_prefixes: Iterable[str]):
        super().__init__(app)
        self._monitor = monitor
        self._include_prefixes = tuple(include_prefixes)

    def _should_record(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self._include_prefixes)

    async def dispatch(self, request: Request, call_next) -> Response:
        start = perf_counter()
        response = await call_next(request)
        elapsed_ms = (perf_counter() - start) * 1000.0

        path = request.url.path
        if self._should_record(path):
            self._monitor.record(path, elapsed_ms)

        response.headers["X-Request-Latency-Ms"] = f"{elapsed_ms:.2f}"
        return response


_monitor: Optional[LatencyMonitor] = None


def get_latency_monitor() -> LatencyMonitor:
    global _monitor
    if _monitor is None:
        _monitor = LatencyMonitor()
    return _monitor

