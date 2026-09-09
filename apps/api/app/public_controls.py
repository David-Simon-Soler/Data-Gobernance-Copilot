"""Bounded, single-process controls for controlled public deployments."""

from __future__ import annotations

import asyncio
import math
import os
import threading
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, TypeVar
from urllib.parse import urlsplit


LOCAL_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)

_T = TypeVar("_T")


def _read_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise RuntimeError(f"{name} must be a boolean")


def _read_positive_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive integer") from exc
    if value < 1:
        raise RuntimeError(f"{name} must be a positive integer")
    return value


def _read_positive_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = float(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive number") from exc
    if not math.isfinite(value) or value <= 0:
        raise RuntimeError(f"{name} must be a positive number")
    return value


def parse_cors_origins(raw: str) -> tuple[str, ...]:
    """Return explicit HTTP(S) origins, ignoring malformed or unsafe entries."""

    origins: list[str] = []
    for candidate in raw.split(","):
        value = candidate.strip()
        if not value or value == "*":
            continue
        try:
            parsed = urlsplit(value)
            _ = parsed.port
        except ValueError:
            continue
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            continue
        normalized = f"{parsed.scheme}://{parsed.netloc}"
        if normalized not in origins:
            origins.append(normalized)
    return tuple(origins)


@dataclass(frozen=True, slots=True)
class PublicProtectionSettings:
    cors_origins: tuple[str, ...]
    rate_limit_enabled: bool = True
    rate_limit_burst: int = 5
    rate_limit_refill_seconds: float = 12.0
    rate_limit_max_clients: int = 10_000
    max_concurrent_analyses: int = 1
    admission_wait_seconds: float = 0.1
    analysis_timeout_seconds: float = 30.0

    @classmethod
    def from_env(cls) -> PublicProtectionSettings:
        raw_origins = os.getenv(
            "DATA_GOV_CORS_ORIGINS", ",".join(LOCAL_CORS_ORIGINS)
        )
        return cls(
            cors_origins=parse_cors_origins(raw_origins),
            rate_limit_enabled=_read_bool("DATA_GOV_RATE_LIMIT_ENABLED", True),
            rate_limit_burst=_read_positive_int("DATA_GOV_RATE_LIMIT_BURST", 5),
            rate_limit_refill_seconds=_read_positive_float(
                "DATA_GOV_RATE_LIMIT_REFILL_SECONDS", 12.0
            ),
            rate_limit_max_clients=_read_positive_int(
                "DATA_GOV_RATE_LIMIT_MAX_CLIENTS", 10_000
            ),
            max_concurrent_analyses=_read_positive_int(
                "DATA_GOV_MAX_CONCURRENT_ANALYSES", 1
            ),
            admission_wait_seconds=_read_positive_float(
                "DATA_GOV_ADMISSION_WAIT_SECONDS", 0.1
            ),
            analysis_timeout_seconds=_read_positive_float(
                "DATA_GOV_ANALYSIS_TIMEOUT_SECONDS", 30.0
            ),
        )


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


@dataclass(slots=True)
class _TokenBucket:
    tokens: float
    updated_at: float


class InMemoryRateLimiter:
    """Bounded token buckets keyed by the direct ASGI peer address."""

    def __init__(
        self,
        *,
        enabled: bool,
        burst: int,
        refill_seconds: float,
        max_clients: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._enabled = enabled
        self._burst = burst
        self._refill_seconds = refill_seconds
        self._max_clients = max_clients
        self._clock = clock
        self._buckets: OrderedDict[str, _TokenBucket] = OrderedDict()
        self._lock = threading.Lock()

    def check(self, client_key: str) -> RateLimitDecision:
        if not self._enabled:
            return RateLimitDecision(allowed=True)

        now = self._clock()
        with self._lock:
            bucket = self._buckets.pop(client_key, None)
            if bucket is None:
                bucket = _TokenBucket(tokens=float(self._burst), updated_at=now)
            else:
                elapsed = max(0.0, now - bucket.updated_at)
                bucket.tokens = min(
                    float(self._burst),
                    bucket.tokens + elapsed / self._refill_seconds,
                )
                bucket.updated_at = now

            if bucket.tokens >= 1.0:
                bucket.tokens -= 1.0
                decision = RateLimitDecision(allowed=True)
            else:
                retry_after = max(
                    1,
                    math.ceil((1.0 - bucket.tokens) * self._refill_seconds),
                )
                decision = RateLimitDecision(
                    allowed=False, retry_after_seconds=retry_after
                )

            self._buckets[client_key] = bucket
            while len(self._buckets) > self._max_clients:
                self._buckets.popitem(last=False)
            return decision

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


class AnalysisCapacityError(RuntimeError):
    """The bounded analysis admission wait expired."""


class AnalysisTimeoutError(RuntimeError):
    """The response timeout expired while an analysis thread remained active."""


class AnalysisAdmissionController:
    """Bound concurrent analyses without blocking the ASGI event loop."""

    def __init__(
        self,
        *,
        max_concurrent: int,
        admission_wait_seconds: float,
        analysis_timeout_seconds: float,
    ) -> None:
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._admission_wait_seconds = admission_wait_seconds
        self._analysis_timeout_seconds = analysis_timeout_seconds
        self._active_count = 0

    @property
    def active_count(self) -> int:
        return self._active_count

    async def acquire(self) -> AnalysisPermit:
        try:
            await asyncio.wait_for(
                self._semaphore.acquire(), timeout=self._admission_wait_seconds
            )
        except TimeoutError as exc:
            raise AnalysisCapacityError from exc
        self._active_count += 1
        return AnalysisPermit(self, self._analysis_timeout_seconds)

    def _release(self) -> None:
        self._active_count -= 1
        self._semaphore.release()


class AnalysisPermit:
    def __init__(
        self, controller: AnalysisAdmissionController, timeout_seconds: float
    ) -> None:
        self._controller = controller
        self._timeout_seconds = timeout_seconds
        self._released = False
        self._release_deferred = False

    async def run(self, function: Callable[..., _T], *args: Any) -> _T:
        worker = asyncio.create_task(asyncio.to_thread(function, *args))
        try:
            return await asyncio.wait_for(
                asyncio.shield(worker), timeout=self._timeout_seconds
            )
        except TimeoutError as exc:
            if worker.done():
                return worker.result()
            self._defer_release(worker)
            raise AnalysisTimeoutError from exc
        except asyncio.CancelledError:
            if not worker.done():
                self._defer_release(worker)
            raise

    def _defer_release(self, worker: asyncio.Task[Any]) -> None:
        self._release_deferred = True

        def release_after_worker(task: asyncio.Task[Any]) -> None:
            try:
                task.exception()
            except BaseException:
                pass
            if not self._released:
                self._released = True
                self._controller._release()

        worker.add_done_callback(release_after_worker)

    def release(self) -> None:
        if self._released or self._release_deferred:
            return
        self._released = True
        self._controller._release()
