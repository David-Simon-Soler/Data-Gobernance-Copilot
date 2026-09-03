from dataclasses import dataclass
from enum import StrEnum
from app.profiling.models import AssertionLevel, Confidence, Evidence, Finding

class GovernanceCategory(StrEnum):
    IDENTIFIER="IDENTIFIER"; QUASI_IDENTIFIER="QUASI_IDENTIFIER"; CONTACT_INFORMATION="CONTACT_INFORMATION"; GEOGRAPHIC_INFORMATION="GEOGRAPHIC_INFORMATION"; DEMOGRAPHIC_INFORMATION="DEMOGRAPHIC_INFORMATION"; FINANCIAL_INFORMATION="FINANCIAL_INFORMATION"; TEMPORAL_FIELD="TEMPORAL_FIELD"; FREE_TEXT="FREE_TEXT"; BUSINESS_METRIC="BUSINESS_METRIC"; CATEGORICAL_DIMENSION="CATEGORICAL_DIMENSION"; POTENTIAL_PERSONAL_DATA="POTENTIAL_PERSONAL_DATA"
class SignalSource(StrEnum):
    COLUMN_NAME="COLUMN_NAME"; VALUE_PATTERN="VALUE_PATTERN"; PRIMITIVE_TYPE="PRIMITIVE_TYPE"; UNIQUENESS="UNIQUENESS"; VALUE_DISTRIBUTION="VALUE_DISTRIBUTION"
@dataclass(frozen=True,slots=True)
class GovernanceSignal:
    id:str; source:SignalSource; signal_type:str; strength:int; deterministic:bool; rule_id:str; rule_version:str; evidence_id:str
@dataclass(frozen=True,slots=True)
class GovernanceClassification:
    id:str; column_id:str; category:GovernanceCategory; assertion_level:AssertionLevel; confidence:Confidence; deterministic:bool; method:str; rule_version:str; signals:tuple[GovernanceSignal,...]; evidence_ids:tuple[str,...]
@dataclass(frozen=True,slots=True)
class GovernanceSummary:
    classified_column_count:int; columns_with_potential_personal_data:tuple[str,...]; category_counts:tuple[tuple[GovernanceCategory,int],...]
@dataclass(frozen=True,slots=True)
class GovernanceAssessment:
    classifications:tuple[GovernanceClassification,...]; findings:tuple[Finding,...]; evidence:tuple[Evidence,...]; summary:GovernanceSummary; model_version:str="0.1"
