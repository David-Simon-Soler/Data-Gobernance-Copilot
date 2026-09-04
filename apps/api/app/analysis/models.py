from typing import Any
from pydantic import BaseModel, ConfigDict

class AnalysisMetadata(BaseModel):
    source_filename: str
    source_format: str
    sheet_name: str | None = None
    row_count: int
    column_count: int
    warnings: tuple[str, ...] = ()

class AnalysisPayload(BaseModel):
    profiling: dict[str, Any]
    quality: dict[str, Any]
    governance: dict[str, Any]
    recommendations: dict[str, Any]

class AnalysisResponse(BaseModel):
    schema_version: str = "0.1"
    metadata: AnalysisMetadata
    analysis: AnalysisPayload

class APIErrorBody(BaseModel):
    code: str
    message: str

class APIErrorResponse(BaseModel):
    error: APIErrorBody
