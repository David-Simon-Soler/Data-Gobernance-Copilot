import asyncio
import threading
import time

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import create_app
from app.public_controls import (
    AnalysisAdmissionController,
    AnalysisCapacityError,
    AnalysisTimeoutError,
    InMemoryRateLimiter,
    PublicProtectionSettings,
    parse_cors_origins,
)


def settings(**overrides) -> PublicProtectionSettings:
    values = {
        "cors_origins": ("https://demo.example",),
        "rate_limit_enabled": False,
        "rate_limit_burst": 5,
        "rate_limit_refill_seconds": 12.0,
        "rate_limit_max_clients": 100,
        "max_concurrent_analyses": 1,
        "admission_wait_seconds": 0.01,
        "analysis_timeout_seconds": 1.0,
    }
    values.update(overrides)
    return PublicProtectionSettings(**values)


def test_rate_limiter_triggers_refills_and_isolates_direct_clients():
    now = [0.0]
    limiter = InMemoryRateLimiter(
        enabled=True,
        burst=1,
        refill_seconds=10.0,
        max_clients=10,
        clock=lambda: now[0],
    )

    assert limiter.check("192.0.2.1").allowed
    rejected = limiter.check("192.0.2.1")
    assert not rejected.allowed
    assert rejected.retry_after_seconds == 10
    assert limiter.check("198.51.100.7").allowed

    now[0] = 10.0
    assert limiter.check("192.0.2.1").allowed


def test_rate_limit_response_is_safe_and_does_not_trust_forwarded_for():
    api = create_app(
        settings(
            rate_limit_enabled=True,
            rate_limit_burst=1,
            rate_limit_refill_seconds=60.0,
        )
    )
    client = TestClient(api)
    first = client.post(
        "/api/v1/analyze",
        files={"file": ("small.csv", b"id\n1\n", "text/csv")},
        headers={"X-Forwarded-For": "203.0.113.99"},
    )
    second = client.post(
        "/api/v1/analyze",
        files={"file": ("SECRET.csv", b"id\n1\n", "text/csv")},
        headers={"X-Forwarded-For": "198.51.100.2"},
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json() == {
        "error": {
            "code": "rate_limit_exceeded",
            "message": "Too many analysis requests. Retry after the indicated delay.",
        }
    }
    assert second.headers["retry-after"] == "60"
    assert "SECRET" not in second.text


def test_analysis_admission_rejects_saturation_then_releases_after_success():
    async def scenario():
        controller = AnalysisAdmissionController(
            max_concurrent=1,
            admission_wait_seconds=0.01,
            analysis_timeout_seconds=1.0,
        )
        started = threading.Event()
        release = threading.Event()

        def blocked_analysis():
            started.set()
            release.wait(timeout=1)
            return "done"

        first_permit = await controller.acquire()
        first = asyncio.create_task(first_permit.run(blocked_analysis))
        assert await asyncio.to_thread(started.wait, 1)
        with pytest.raises(AnalysisCapacityError):
            await controller.acquire()

        release.set()
        assert await first == "done"
        first_permit.release()
        assert controller.active_count == 0

        next_permit = await controller.acquire()
        next_permit.release()
        assert controller.active_count == 0

    asyncio.run(scenario())


def test_analysis_admission_releases_after_exception():
    async def scenario():
        controller = AnalysisAdmissionController(
            max_concurrent=1,
            admission_wait_seconds=0.01,
            analysis_timeout_seconds=1.0,
        )
        permit = await controller.acquire()
        with pytest.raises(ValueError, match="private detail"):
            await permit.run(lambda: (_ for _ in ()).throw(ValueError("private detail")))
        permit.release()

        assert controller.active_count == 0
        next_permit = await controller.acquire()
        next_permit.release()

    asyncio.run(scenario())


def test_analysis_timeout_is_bounded_but_keeps_capacity_until_worker_finishes():
    async def scenario():
        controller = AnalysisAdmissionController(
            max_concurrent=1,
            admission_wait_seconds=1.0,
            analysis_timeout_seconds=0.01,
        )
        started = threading.Event()
        release = threading.Event()

        def blocked_analysis():
            started.set()
            release.wait(timeout=1)

        permit = await controller.acquire()
        task = asyncio.create_task(permit.run(blocked_analysis))
        assert await asyncio.to_thread(started.wait, 1)
        with pytest.raises(AnalysisTimeoutError):
            await task
        permit.release()
        assert controller.active_count == 1

        release.set()
        next_permit = await controller.acquire()
        assert controller.active_count == 1
        next_permit.release()
        assert controller.active_count == 0

    asyncio.run(scenario())


def test_capacity_and_timeout_api_errors_are_safe(monkeypatch):
    capacity_api = create_app(settings())

    async def reject():
        raise AnalysisCapacityError

    monkeypatch.setattr(capacity_api.state.analysis_admission, "acquire", reject)
    capacity_response = TestClient(capacity_api).post(
        "/api/v1/analyze",
        files={"file": ("SECRET.csv", b"id\n1\n", "text/csv")},
    )
    assert capacity_response.status_code == 503
    assert capacity_response.json()["error"]["code"] == "analysis_capacity_exceeded"
    assert "SECRET" not in capacity_response.text

    original = main_module.analyze_dataset
    timeout_api = create_app(settings(analysis_timeout_seconds=0.005))

    def slow_analysis(*args):
        time.sleep(0.03)
        return original(*args)

    monkeypatch.setattr(main_module, "analyze_dataset", slow_analysis)
    timeout_response = TestClient(timeout_api).post(
        "/api/v1/analyze",
        files={"file": ("SECRET.csv", b"id\n1\n", "text/csv")},
    )
    assert timeout_response.status_code == 503
    assert timeout_response.json()["error"]["code"] == "analysis_timeout"
    assert "SECRET" not in timeout_response.text


def test_cors_accepts_only_configured_production_origin():
    api = create_app(settings(cors_origins=("https://demo.example",)))
    client = TestClient(api)

    allowed = client.options(
        "/api/v1/analyze",
        headers={
            "Origin": "https://demo.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    denied = client.options(
        "/api/v1/analyze",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://demo.example"
    assert allowed.headers["access-control-allow-methods"] == "GET, POST"
    assert "content-type" in allowed.headers["access-control-allow-headers"].lower()
    assert "access-control-allow-credentials" not in allowed.headers
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_malformed_cors_entries_fail_closed():
    assert parse_cors_origins(
        "*,javascript:alert(1),https://user:pass@example.com,"
        "https://example.com/path,,https://[broken"
    ) == ()


def test_security_headers_and_health_contract_are_unchanged():
    response = TestClient(create_app(settings())).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["content-security-policy"] == "frame-ancestors 'none'"
    assert response.headers["permissions-policy"] == (
        "camera=(), microphone=(), geolocation=()"
    )


def test_analysis_cancellation_defers_release_until_worker_finishes():
    async def scenario():
        controller = AnalysisAdmissionController(
            max_concurrent=1,
            admission_wait_seconds=1.0,
            analysis_timeout_seconds=1.0,
        )
        started = threading.Event()
        release = threading.Event()

        def blocked_analysis():
            started.set()
            release.wait(timeout=1)

        permit = await controller.acquire()
        task = asyncio.create_task(permit.run(blocked_analysis))
        assert await asyncio.to_thread(started.wait, 1)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        permit.release()
        assert controller.active_count == 1

        release.set()
        next_permit = await controller.acquire()
        assert controller.active_count == 1
        next_permit.release()
        assert controller.active_count == 0

    asyncio.run(scenario())
