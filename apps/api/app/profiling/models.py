from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum


class PrimitiveType(StrEnum):
    NULL = "NULL"
    BOOLEAN = "BOOLEAN"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    STRING = "STRING"
    DATE = "DATE"
    DATETIME = "DATETIME"


class AssertionLevel(StrEnum):
    DETECTED = "DETECTED"
    INFERRED = "INFERRED"
    SUGGESTED = "SUGGESTED"


class Confidence(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Severity(StrEnum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass(frozen=True, slots=True)
class BasicStatistics:
    minimum: int | float | date | datetime | None = None
    maximum: int | float | date | datetime | None = None
    mean: float | None = None
    median: float | None = None
    stddev: float | None = None
    min_length: int | None = None
    max_length: int | None = None
    average_length: float | None = None


@dataclass(frozen=True, slots=True)
class CandidateIdentifier:
    kind: str
    reason: str
    name_signal: bool
    completeness: float
    uniqueness: float
    thresholds: tuple[tuple[str, int | float], ...]
    confirmed_key: bool = False


@dataclass(frozen=True, slots=True)
class Evidence:
    id: str
    type: str
    subject: str
    rule_id: str
    rule_version: str
    metric: str
    observed_value: int | float | str
    denominator: int | None = None
    affected_rows: int | None = None
    sample_policy: str = "none"
    details: tuple[tuple[str, int | float | str | bool], ...] = ()


@dataclass(frozen=True, slots=True)
class Finding:
    id: str
    assertion_level: AssertionLevel
    severity: Severity
    confidence: Confidence
    category: str
    subject: str
    title: str
    description: str
    method: str
    evidence_ids: tuple[str, ...]
    recommendation_ids: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ColumnProfile:
    column_id: str
    name: str
    position: int
    physical_dtype: str
    inferred_primitive_type: PrimitiveType
    nullable: bool
    row_count: int
    non_null_count: int
    null_count: int
    null_ratio: float
    distinct_count: int
    uniqueness_ratio: float | None
    cardinality_ratio: float | None
    duplicate_excess_rows: int
    is_constant: bool
    is_all_null: bool
    is_candidate_identifier: bool
    candidate_identifier_reason: str | None
    candidate_identifier: CandidateIdentifier | None
    basic_statistics: BasicStatistics | None
    classifications: tuple[str, ...]
    findings: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ProfilingMetadata:
    source_filename: str
    source_format: str
    profiling_method: str = "deterministic_polars_v0_1"


@dataclass(frozen=True, slots=True)
class DatasetProfile:
    row_count: int
    column_count: int
    columns: tuple[ColumnProfile, ...]
    duplicate_row_count: int
    duplicate_excess_row_count: int
    complete_duplicate_group_count: int
    candidate_identifiers: tuple[CandidateIdentifier, ...]
    findings: tuple[Finding, ...]
    evidence: tuple[Evidence, ...]
    profiling_metadata: ProfilingMetadata
    model_version: str = "0.1"
