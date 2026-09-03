from dataclasses import dataclass

from app.profiling.models import Applicability, Evidence, Finding


@dataclass(frozen=True, slots=True)
class QualityDimension:
    name: str
    score: float | None
    applicability: Applicability
    reason: str | None
    numerator: int | None
    denominator: int | None


@dataclass(frozen=True, slots=True)
class QualityScore:
    overall_score: int | None
    dimensions: tuple[QualityDimension, ...]
    applied_weights: tuple[tuple[str, int], ...]
    applicability: tuple[tuple[str, Applicability], ...]
    not_applicable_reasons: tuple[tuple[str, str], ...]
    observed_completeness: float | None
    findings: tuple[Finding, ...] = ()
    evidence: tuple[Evidence, ...] = ()
    model_version: str = "0.1"
