from datetime import datetime

import polars as pl
import pytest

from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.profiling.models import PrimitiveType


def _ingested(data: dict[str, list[object]]) -> IngestedDataset:
    dataframe = pl.DataFrame(data, strict=False)
    return IngestedDataset(
        source_filename="synthetic.csv", source_format=SourceFormat.CSV, sheet_name=None,
        row_count=dataframe.height, column_count=dataframe.width, column_names=tuple(dataframe.columns),
        dataframe=dataframe, warnings=(), ingestion_metadata=IngestionMetadata(delimiter=","),
    )


def _column(profile, name: str):
    return next(column for column in profile.columns if column.name == name)


def test_profiles_simple_mixed_dataset_without_mutating_dataframe() -> None:
    ingested = _ingested({"id": ["1", "2"], "active": ["true", "false"], "name": ["Ada", "Lin"]})
    original = ingested.dataframe.clone()
    profile = profile_dataset(ingested)
    assert profile.row_count == 2 and profile.column_count == 3
    assert _column(profile, "id").inferred_primitive_type is PrimitiveType.INTEGER
    assert _column(profile, "active").inferred_primitive_type is PrimitiveType.BOOLEAN
    assert ingested.dataframe.equals(original)


def test_profiles_all_null_and_constant_columns() -> None:
    profile = profile_dataset(_ingested({"all_null": [None, None], "constant": ["x", "x"]}))
    all_null, constant = _column(profile, "all_null"), _column(profile, "constant")
    assert all_null.is_all_null and not all_null.is_constant and all_null.uniqueness_ratio is None
    assert constant.is_constant and constant.duplicate_excess_rows == 1


def test_counts_nulls_distinct_uniqueness_and_column_duplicates() -> None:
    column = _column(profile_dataset(_ingested({"value": ["A", "A", "A", "B", "B", "C", None]})), "value")
    assert (column.null_count, column.non_null_count, column.distinct_count, column.uniqueness_ratio, column.duplicate_excess_rows) == (1, 6, 3, 0.5, 3)


def test_measures_complete_duplicate_rows() -> None:
    profile = profile_dataset(_ingested({"id": ["1", "1", "2", "2", "2"], "name": ["A", "A", "B", "B", "B"]}))
    assert (profile.duplicate_row_count, profile.duplicate_excess_row_count, profile.complete_duplicate_group_count) == (5, 3, 2)
    assert any(finding.category == "duplicate_record" for finding in profile.findings)


@pytest.mark.parametrize(("values", "expected"), [
    (["1", "2", "3"], PrimitiveType.INTEGER), (["1.5", "2.0"], PrimitiveType.FLOAT),
    (["true", "FALSE"], PrimitiveType.BOOLEAN), (["1", "2", "abc"], PrimitiveType.STRING),
    (["2025-01-02", "2025-01-03"], PrimitiveType.DATE),
    (["2025-01-02T10:11:12Z", "2025-01-03T10:11:12+01:00"], PrimitiveType.DATETIME),
    (["00123", "00456"], PrimitiveType.STRING), (["01/02/2025", "02/03/2025"], PrimitiveType.STRING),
    (["", "text"], PrimitiveType.STRING), (["yes", "no"], PrimitiveType.STRING),
])
def test_infers_conservative_primitive_types(values: list[str], expected: PrimitiveType) -> None:
    assert _column(profile_dataset(_ingested({"value": values})), "value").inferred_primitive_type is expected


def test_empty_string_is_not_null() -> None:
    column = _column(profile_dataset(_ingested({"value": ["", None]})), "value")
    assert (column.null_count, column.non_null_count) == (1, 1)


def test_collects_numeric_and_string_statistics() -> None:
    profile = profile_dataset(_ingested({"amount": [1, 2], "name": ["Á", "Ada"]}))
    amount, name = _column(profile, "amount").basic_statistics, _column(profile, "name").basic_statistics
    assert amount is not None and (amount.minimum, amount.maximum, amount.mean, amount.median, amount.stddev) == (1, 2, 1.5, 1.5, 0.5)
    assert name is not None and (name.min_length, name.max_length, name.average_length) == (1, 3, 2.0)


def test_collects_datetime_statistics() -> None:
    profile = profile_dataset(_ingested({"at": [datetime(2025, 1, 2, 10), datetime(2025, 1, 3, 10)]}))
    statistics = _column(profile, "at").basic_statistics
    assert statistics is not None
    assert statistics.minimum == datetime(2025, 1, 2, 10) and statistics.maximum == datetime(2025, 1, 3, 10)


def test_candidate_identifier_with_name_signal() -> None:
    column = _column(profile_dataset(_ingested({"customer_id": [str(index) for index in range(10)]})), "customer_id")
    assert column.is_candidate_identifier and column.candidate_identifier_reason == "name_signal_thresholds_v0_1"


def test_candidate_identifier_without_name_signal() -> None:
    assert _column(profile_dataset(_ingested({"opaque": [f"v{index}" for index in range(100)]})), "opaque").is_candidate_identifier


def test_rejects_candidate_identifier_below_row_threshold() -> None:
    assert not _column(profile_dataset(_ingested({"id": [str(index) for index in range(9)]})), "id").is_candidate_identifier


def test_rejects_candidate_identifier_for_completeness_and_uniqueness() -> None:
    incomplete = profile_dataset(_ingested({"id": [str(index) if index < 9 else None for index in range(10)]}))
    repeated = profile_dataset(_ingested({"id": ["1"] * 10}))
    assert not _column(incomplete, "id").is_candidate_identifier and not _column(repeated, "id").is_candidate_identifier


def test_code_name_is_not_identifier_signal() -> None:
    assert not _column(profile_dataset(_ingested({"code": [str(index) for index in range(10)]})), "code").is_candidate_identifier


def test_zero_row_dataframe_and_single_row_dataset() -> None:
    assert profile_dataset(_ingested({"id": []})).row_count == 0
    assert profile_dataset(_ingested({"id": ["1"]})).duplicate_excess_row_count == 0


def test_nan_and_infinity_are_not_inferred_as_float() -> None:
    assert _column(profile_dataset(_ingested({"value": [1.0, float("nan"), float("inf")]})), "value").inferred_primitive_type is PrimitiveType.STRING
