from dataclasses import dataclass
from enum import StrEnum
from app.profiling.models import AssertionLevel

class RecommendationSource(StrEnum):
    QUALITY = "QUALITY"
    GOVERNANCE = "GOVERNANCE"

class RecommendationPriority(StrEnum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"

class RecommendationCategory(StrEnum):
    DATA_QUALITY = "DATA_QUALITY"
    GOVERNANCE = "GOVERNANCE"
    PRIVACY_REVIEW = "PRIVACY_REVIEW"

@dataclass(frozen=True, slots=True)
class Recommendation:
    id: str
    finding_id: str
    source: RecommendationSource
    priority: RecommendationPriority
    category: RecommendationCategory
    action: str
    rationale: str
    assertion_level: AssertionLevel = AssertionLevel.SUGGESTED
    rule_id: str = ""
    model_version: str = "0.1"

@dataclass(frozen=True, slots=True)
class RecommendationSummary:
    total_count: int
    counts_by_priority: tuple[tuple[RecommendationPriority, int], ...]
    counts_by_category: tuple[tuple[RecommendationCategory, int], ...]

@dataclass(frozen=True, slots=True)
class RecommendationSet:
    recommendations: tuple[Recommendation, ...]
    summary: RecommendationSummary
    model_version: str = "0.1"
