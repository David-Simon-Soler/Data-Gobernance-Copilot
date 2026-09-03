import polars as pl

from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.profiling.models import PrimitiveType
from app.profiling.quality_signals import _has_leading_zero_protection, collect_quality_signals
from app.quality import evaluate_quality


def _score(values: list[object]):
    frame = pl.DataFrame({"value": values}, strict=False)
    profile = profile_dataset(IngestedDataset("synthetic.csv", SourceFormat.CSV, None, frame.height, frame.width, tuple(frame.columns), frame, (), IngestionMetadata(",")))
    return evaluate_quality(profile)


def test_external_trim_is_validation_only_and_whitespace_remains_non_null() -> None:
    assert collect_quality_signals([" 1 "]).primitive_type is PrimitiveType.INTEGER
    assert collect_quality_signals([" true "]).primitive_type is PrimitiveType.BOOLEAN
    assert collect_quality_signals(["2026-01-01 "]).primitive_type is PrimitiveType.DATE
    signals = collect_quality_signals(["   "])
    assert signals.primitive_type is PrimitiveType.STRING and signals.non_null_count == 1


def test_leading_zero_protection_uses_inclusive_95_percent_threshold() -> None:
    assert _has_leading_zero_protection(["001"] * 95 + ["1"] * 5)
    assert not _has_leading_zero_protection(["001"] * 94 + ["1"] * 6)
    assert _has_leading_zero_protection(["001"] * 100)


def test_boolean_casing_families_do_not_mislabel_mixed_case_as_title() -> None:
    signals = collect_quality_signals(["true", "TRUE", "True", "tRuE", "false", "FALSE", "False", "fALse"])
    assert signals.primitive_type is PrimitiveType.BOOLEAN
    assert dict(signals.format_family_counts) == {"BOOLEAN_LOWER": 2, "BOOLEAN_OTHER": 2, "BOOLEAN_TITLE": 2, "BOOLEAN_UPPER": 2}


def test_invalid_values_create_safe_deterministic_findings_and_evidence() -> None:
    first, second = _score([str(index) for index in range(98)] + ["bad", "also_bad"]), _score([str(index) for index in range(98)] + ["bad", "also_bad"])
    assert first.findings == second.findings and first.evidence == second.evidence
    finding, evidence = first.findings[0], first.evidence[0]
    assert finding.assertion_level.value == "DETECTED" and finding.category == "malformed_value"
    assert evidence.observed_value == 2 and evidence.denominator == 100 and evidence.rule_version == "0.1"
    assert "bad" not in str(evidence) and "also_bad" not in str(evidence)
