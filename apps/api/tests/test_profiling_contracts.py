from datetime import date, datetime

import polars as pl
import pytest

from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.profiling.models import AssertionLevel, PrimitiveType


def _profile(name: str, values: list[object]):
    dataframe = pl.DataFrame({name: values}, strict=False)
    ingested = IngestedDataset("synthetic.csv", SourceFormat.CSV, None, dataframe.height, dataframe.width, tuple(dataframe.columns), dataframe, (), IngestionMetadata(","))
    return profile_dataset(ingested).columns[0], profile_dataset(ingested)


def _unique(count: int) -> list[str]:
    return [f"v{index}" for index in range(count)]


def test_name_signal_threshold_boundaries() -> None:
    row_boundary, _ = _profile("id", _unique(10))
    exact_completeness, _ = _profile("id", _unique(19) + [None])
    exact_uniqueness, _ = _profile("id", _unique(49) + ["v0"])
    below_completeness, _ = _profile("id", _unique(94) + [None] * 6)
    below_uniqueness, _ = _profile("id", _unique(48) + ["v0", "v1"])
    assert row_boundary.is_candidate_identifier
    assert exact_completeness.is_candidate_identifier
    assert exact_uniqueness.is_candidate_identifier
    assert not below_completeness.is_candidate_identifier
    assert not below_uniqueness.is_candidate_identifier


def test_structural_candidate_threshold_boundaries() -> None:
    row_boundary, _ = _profile("opaque", _unique(100))
    exact_completeness, _ = _profile("opaque", _unique(99) + [None])
    exact_uniqueness, _ = _profile("opaque", _unique(999) + ["v0"])
    below_completeness, _ = _profile("opaque", _unique(98) + [None, None])
    below_uniqueness, _ = _profile("opaque", _unique(998) + ["v0", "v1"])
    assert row_boundary.is_candidate_identifier
    assert exact_completeness.is_candidate_identifier
    assert exact_uniqueness.is_candidate_identifier
    assert not below_completeness.is_candidate_identifier
    assert not below_uniqueness.is_candidate_identifier


@pytest.mark.parametrize(("name", "expected"), [("ID", True), ("Customer_ID", True), ("_id", True), ("someid", False), ("guid", True), ("code", False)])
def test_identifier_name_signals(name: str, expected: bool) -> None:
    column, _ = _profile(name, _unique(10))
    assert column.is_candidate_identifier is expected


def test_nulls_do_not_participate_in_column_duplicates() -> None:
    column, _ = _profile("value", ["A", "A", None, None])
    assert (column.non_null_count, column.distinct_count, column.duplicate_excess_rows) == (2, 1, 1)


def test_complete_row_duplicates_include_nulls() -> None:
    frame = pl.DataFrame({"id": [1, 1], "note": [None, None]}, strict=False)
    ingested = IngestedDataset("synthetic.csv", SourceFormat.CSV, None, 2, 2, tuple(frame.columns), frame, (), IngestionMetadata(","))
    profile = profile_dataset(ingested)
    assert (profile.duplicate_row_count, profile.duplicate_excess_row_count, profile.complete_duplicate_group_count) == (2, 1, 1)


@pytest.mark.parametrize(
    ("values", "expected"),
    [([True, False], PrimitiveType.BOOLEAN), ([1, 2], PrimitiveType.INTEGER), ([1.0, 2.0], PrimitiveType.FLOAT), ([date(2026, 1, 1), date(2026, 1, 2)], PrimitiveType.DATE), ([datetime(2026, 1, 1), datetime(2026, 1, 2)], PrimitiveType.DATETIME)],
)
def test_physical_polars_dtypes(values: list[object], expected: PrimitiveType) -> None:
    column, _ = _profile("value", values)
    assert column.inferred_primitive_type is expected


@pytest.mark.parametrize("invalid", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_float_falls_back_without_numeric_statistics(invalid: float) -> None:
    column, _ = _profile("value", [1.0, invalid])
    assert column.inferred_primitive_type is PrimitiveType.STRING
    assert column.basic_statistics is None


def test_profile_is_deterministic() -> None:
    frame = pl.DataFrame({"id": _unique(10), "constant": ["x"] * 10}, strict=False)
    ingested = IngestedDataset("synthetic.csv", SourceFormat.CSV, None, 10, 2, tuple(frame.columns), frame, (), IngestionMetadata(","))
    first, second = profile_dataset(ingested), profile_dataset(ingested)
    assert first == second
    assert tuple(item.id for item in first.findings) == tuple(item.id for item in second.findings)
    assert tuple(item.id for item in first.evidence) == tuple(item.id for item in second.evidence)


def test_zero_row_has_no_all_null_finding_or_candidate() -> None:
    column, profile = _profile("id", [])
    assert column.null_count == 0 and column.null_ratio == 0.0 and column.uniqueness_ratio is None
    assert not column.is_all_null and not column.is_candidate_identifier and column.basic_statistics is None
    assert profile.duplicate_excess_row_count == 0
    assert not any(finding.category == "all_null" for finding in profile.findings)


def test_temporal_string_statistics_are_python_temporal_objects() -> None:
    date_column, _ = _profile("day", ["2026-01-01", "2026-01-02"])
    datetime_column, _ = _profile("at", ["2026-01-01T01:00:00", "2026-01-02T01:00:00Z"])
    assert date_column.basic_statistics is not None and date_column.basic_statistics.minimum == date(2026, 1, 1)
    assert datetime_column.basic_statistics is not None and isinstance(datetime_column.basic_statistics.minimum, datetime)


def test_candidate_identifier_finding_is_inferred_with_safe_evidence() -> None:
    column, profile = _profile("id", _unique(10))
    finding = next(item for item in profile.findings if item.id in column.findings)
    evidence = next(item for item in profile.evidence if item.id in finding.evidence_ids)
    details = dict(evidence.details)
    assert finding.assertion_level is AssertionLevel.INFERRED
    assert details["row_count"] == 10 and details["name_signal"] is True
    assert details["matched_rule"] == "name_signal_thresholds_v0_1"
