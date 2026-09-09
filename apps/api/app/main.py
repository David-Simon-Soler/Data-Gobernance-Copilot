from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.datastructures import MutableHeaders

from app.analysis import APIErrorResponse, AnalysisResponse, analyze_dataset
from app.ingestion.errors import (
    DatasetLimitError,
    EmptyDatasetError,
    FileTooLargeError,
    IngestionError,
    MalformedDatasetError,
    SheetNotFoundError,
    UnsupportedFormatError,
)
from app.public_controls import (
    AnalysisAdmissionController,
    AnalysisCapacityError,
    AnalysisTimeoutError,
    InMemoryRateLimiter,
    PublicProtectionSettings,
)

MAX_HTTP_BODY = 6 * 1024 * 1024
MAX_FILE = 5 * 1024 * 1024


class _BodyTooLarge(Exception):
    pass


class HealthResponse(BaseModel):
    status: str


class RequestSizeLimitMiddleware:
    def __init__(self, app, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = scope.get("headers", [])
        declared = next(
            (
                int(value)
                for key, value in headers
                if key.lower() == b"content-length" and value.isdigit()
            ),
            None,
        )
        if declared is not None and declared > self.max_bytes:
            await _request_too_large_response()(scope, receive, send)
            return

        total = 0

        async def limited_receive():
            nonlocal total
            message = await receive()
            if message.get("type") == "http.request":
                total += len(message.get("body", b""))
                if total > self.max_bytes:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            await _request_too_large_response()(scope, receive, send)


class AnalysisRateLimitMiddleware:
    def __init__(self, app, limiter: InMemoryRateLimiter) -> None:
        self.app = app
        self.limiter = limiter

    async def __call__(self, scope, receive, send) -> None:
        if (
            scope["type"] == "http"
            and scope.get("method") == "POST"
            and scope.get("path") == "/api/v1/analyze"
        ):
            client = scope.get("client")
            client_key = str(client[0]) if client else "unknown"
            decision = self.limiter.check(client_key)
            if not decision.allowed:
                response = _safe_error_response(
                    429,
                    "rate_limit_exceeded",
                    "Too many analysis requests. Retry after the indicated delay.",
                    headers={"Retry-After": str(decision.retry_after_seconds)},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


class SecurityHeadersMiddleware:
    _HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "frame-ancestors 'none'",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    }

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in self._HEADERS.items():
                    headers.setdefault(name, value)
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


def _safe_error_response(
    status_code: int,
    code: str,
    message: str,
    *,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


def _request_too_large_response() -> JSONResponse:
    return _safe_error_response(
        413,
        "request_too_large",
        "The HTTP request exceeds the configured size limit.",
    )


def create_app(
    settings: PublicProtectionSettings | None = None,
) -> FastAPI:
    protection = settings or PublicProtectionSettings.from_env()
    limiter = InMemoryRateLimiter(
        enabled=protection.rate_limit_enabled,
        burst=protection.rate_limit_burst,
        refill_seconds=protection.rate_limit_refill_seconds,
        max_clients=protection.rate_limit_max_clients,
    )
    admission = AnalysisAdmissionController(
        max_concurrent=protection.max_concurrent_analyses,
        admission_wait_seconds=protection.admission_wait_seconds,
        analysis_timeout_seconds=protection.analysis_timeout_seconds,
    )

    api = FastAPI(title="Data Governance Copilot API", version="0.1.0")
    api.state.rate_limiter = limiter
    api.state.analysis_admission = admission
    api.state.public_protection_settings = protection

    api.add_middleware(RequestSizeLimitMiddleware, max_bytes=MAX_HTTP_BODY)
    api.add_middleware(AnalysisRateLimitMiddleware, limiter=limiter)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=list(protection.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    api.add_middleware(SecurityHeadersMiddleware)

    @api.exception_handler(RequestValidationError)
    async def validation_error(
        _: Request, __: RequestValidationError
    ) -> JSONResponse:
        return _safe_error_response(
            422,
            "invalid_request",
            "The request does not match the expected API contract.",
        )

    @api.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code == 413 and exc.detail == "request_too_large":
            return _request_too_large_response()
        if exc.status_code == 413:
            return _safe_error_response(
                413,
                "file_too_large",
                "The uploaded file exceeds the configured size limit.",
            )
        return _safe_error_response(
            exc.status_code,
            "http_error",
            "The request could not be processed.",
        )

    @api.exception_handler(IngestionError)
    async def ingestion_error(_: Request, exc: IngestionError) -> JSONResponse:
        mapping = {
            UnsupportedFormatError: 415,
            FileTooLargeError: 413,
            DatasetLimitError: 400,
            MalformedDatasetError: 400,
            EmptyDatasetError: 400,
            SheetNotFoundError: 400,
        }
        status = next(
            (code for error_type, code in mapping.items() if isinstance(exc, error_type)),
            400,
        )
        return _safe_error_response(
            status,
            getattr(exc, "code", "ingestion_error"),
            "The uploaded dataset could not be processed.",
        )

    @api.exception_handler(Exception)
    async def internal_error(_: Request, __: Exception) -> JSONResponse:
        return _safe_error_response(
            500,
            "internal_error",
            "An unexpected error occurred while processing the dataset.",
        )

    @api.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @api.post(
        "/api/v1/analyze",
        response_model=AnalysisResponse,
        responses={
            400: {"model": APIErrorResponse},
            413: {"model": APIErrorResponse},
            415: {"model": APIErrorResponse},
            422: {"model": APIErrorResponse},
            429: {"model": APIErrorResponse},
            500: {"model": APIErrorResponse},
            503: {"model": APIErrorResponse},
        },
    )
    async def analyze(
        file: UploadFile = File(...),
        sheet_name: str | None = Form(None),
    ) -> AnalysisResponse:
        if not file.filename:
            return _safe_error_response(
                400,
                "invalid_filename",
                "A non-empty filename is required.",
            )

        selected_sheet = sheet_name or None
        suffix = (
            file.filename.rsplit(".", 1)[-1].casefold()
            if "." in file.filename
            else ""
        )
        if suffix == "csv" and selected_sheet is not None:
            return _safe_error_response(
                400,
                "sheet_not_applicable",
                "Sheet selection is only available for XLSX files.",
            )

        try:
            permit = await admission.acquire()
        except AnalysisCapacityError:
            return _safe_error_response(
                503,
                "analysis_capacity_exceeded",
                "Analysis capacity is currently full. Retry shortly.",
                headers={"Retry-After": "1"},
            )

        try:
            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_FILE:
                    raise HTTPException(status_code=413, detail="file_too_large")
                chunks.append(chunk)

            try:
                return await permit.run(
                    analyze_dataset,
                    b"".join(chunks),
                    file.filename,
                    selected_sheet,
                )
            except AnalysisTimeoutError:
                return _safe_error_response(
                    503,
                    "analysis_timeout",
                    "The analysis exceeded the response time limit.",
                    headers={"Retry-After": "1"},
                )
        finally:
            permit.release()

    return api


app = create_app()
