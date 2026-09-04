from dataclasses import fields, is_dataclass
from enum import Enum
from typing import Any
from fastapi.encoders import jsonable_encoder
from app.ingestion import ingest_dataset
from app.profiling import profile_dataset
from app.quality import evaluate_quality
from app.governance import evaluate_governance
from app.recommendations import generate_recommendations
from .models import AnalysisMetadata, AnalysisPayload, AnalysisResponse

def analyze_dataset(file_bytes: bytes, filename: str, sheet_name: str | None = None) -> AnalysisResponse:
    ingested = ingest_dataset(file_bytes, filename, sheet_name=sheet_name)
    profile = profile_dataset(ingested)
    quality = evaluate_quality(profile)
    governance = evaluate_governance(profile)
    recommendations = generate_recommendations(quality, governance)
    return AnalysisResponse(metadata=AnalysisMetadata(source_filename=ingested.source_filename, source_format=ingested.source_format.value, sheet_name=ingested.sheet_name, row_count=ingested.row_count, column_count=ingested.column_count, warnings=ingested.warnings), analysis=AnalysisPayload(profiling=_safe(profile), quality=_safe(quality), governance=_safe(governance), recommendations=_safe(recommendations)))

def _safe(value: Any) -> Any:
    if is_dataclass(value):
        return {field.name: _safe(getattr(value, field.name)) for field in fields(value)}
    if isinstance(value, Enum): return value.value
    if isinstance(value, tuple): return [_safe(item) for item in value]
    if isinstance(value, list): return [_safe(item) for item in value]
    if isinstance(value, dict): return {str(k): _safe(v) for k,v in value.items()}
    return jsonable_encoder(value)
