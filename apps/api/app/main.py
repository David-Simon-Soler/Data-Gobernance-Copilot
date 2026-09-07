import os
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.analysis import analyze_dataset, AnalysisResponse, APIErrorResponse
from app.ingestion.errors import IngestionError, UnsupportedFormatError, FileTooLargeError, DatasetLimitError, MalformedDatasetError, EmptyDatasetError, SheetNotFoundError

MAX_HTTP_BODY = 6 * 1024 * 1024
MAX_FILE = 5 * 1024 * 1024
class _BodyTooLarge(Exception): pass
class HealthResponse(BaseModel): status: str

class RequestSizeLimitMiddleware:
    def __init__(self, app, max_bytes: int): self.app, self.max_bytes = app, max_bytes
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http": return await self.app(scope, receive, send)
        length = scope.get("headers", [])
        declared = next((int(v) for k,v in length if k.lower()==b"content-length" and v.isdigit()), None)
        if declared is not None and declared > self.max_bytes:
            return await JSONResponse(status_code=413, content={"error":{"code":"request_too_large","message":"The HTTP request exceeds the configured size limit."}})(scope, receive, send)
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
            return await self.app(scope, limited_receive, send)
        except _BodyTooLarge:
            response = JSONResponse(status_code=413, content={"error":{"code":"request_too_large","message":"The HTTP request exceeds the configured size limit."}})
            return await response(scope, receive, send)

def _origins():
    raw=os.getenv("DATA_GOV_CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    return [x.strip() for x in raw.split(",") if x.strip()]
app = FastAPI(title="Data Governance Copilot API", version="0.1.0")
app.add_middleware(RequestSizeLimitMiddleware, max_bytes=MAX_HTTP_BODY)
app.add_middleware(CORSMiddleware, allow_origins=_origins(), allow_credentials=False, allow_methods=["GET","POST"], allow_headers=["Content-Type"])

@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, __: RequestValidationError): return JSONResponse(status_code=422, content={"error":{"code":"invalid_request","message":"The request does not match the expected API contract."}})
@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    code = "request_too_large" if exc.status_code == 413 and exc.detail == "request_too_large" else "file_too_large" if exc.status_code == 413 else "http_error"
    message = "The HTTP request exceeds the configured size limit." if code == "request_too_large" else "The uploaded file exceeds the configured size limit." if code == "file_too_large" else "The request could not be processed."
    return JSONResponse(status_code=exc.status_code, content={"error":{"code":code,"message":message}})
@app.exception_handler(IngestionError)
async def ingestion_error(_: Request, exc: IngestionError):
    mapping={UnsupportedFormatError:415, FileTooLargeError:413, DatasetLimitError:400, MalformedDatasetError:400, EmptyDatasetError:400, SheetNotFoundError:400}
    status=next((code for typ,code in mapping.items() if isinstance(exc,typ)),400)
    return JSONResponse(status_code=status, content={"error":{"code":getattr(exc,"code","ingestion_error"),"message":"The uploaded dataset could not be processed."}})
@app.exception_handler(Exception)
async def internal_error(_: Request, __: Exception): return JSONResponse(status_code=500, content={"error":{"code":"internal_error","message":"An unexpected error occurred while processing the dataset."}})

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse: return HealthResponse(status="ok")

@app.post("/api/v1/analyze", response_model=AnalysisResponse, responses={400:{"model":APIErrorResponse},413:{"model":APIErrorResponse},415:{"model":APIErrorResponse},422:{"model":APIErrorResponse},500:{"model":APIErrorResponse}})
async def analyze(file: UploadFile = File(...), sheet_name: str | None = Form(None)) -> AnalysisResponse:
    if not file.filename: return JSONResponse(status_code=400, content={"error":{"code":"invalid_filename","message":"A non-empty filename is required."}})
    if sheet_name is not None and sheet_name == "": sheet_name = None
    suffix = file.filename.rsplit(".",1)[-1].casefold() if "." in file.filename else ""
    if suffix == "csv" and sheet_name is not None: return JSONResponse(status_code=400, content={"error":{"code":"sheet_not_applicable","message":"Sheet selection is only available for XLSX files."}})
    chunks=[]; total=0
    while True:
        chunk=await file.read(1024*1024)
        if not chunk: break
        total += len(chunk)
        if total > MAX_FILE: raise HTTPException(status_code=413, detail="file_too_large")
        chunks.append(chunk)
    return analyze_dataset(b"".join(chunks), file.filename, sheet_name)
