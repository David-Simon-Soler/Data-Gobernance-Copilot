from dataclasses import replace

import polars as pl

from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.profiling.models import Applicability
from app.quality import evaluate_quality


def _profile(data: dict[str, list[object]]):
    frame = pl.DataFrame(data, strict=False)
    return profile_dataset(IngestedDataset("synthetic.csv", SourceFormat.CSV, None, frame.height, frame.width, tuple(frame.columns), frame, (), IngestionMetadata(",")))


def _dimensions(score):
    return {dimension.name: dimension for dimension in score.dimensions}


def test_structural_completeness_uses_only_candidate_identifiers() -> None:
    score = evaluate_quality(_profile({"id": [f"v{index}" if index < 19 else None for index in range(20)], "note": [None] * 10 + ["x"] * 10}))
    assert _dimensions(score)["structural_completeness"].score == 95.0
    assert score.observed_completeness == 72.5


def test_multiple_candidates_use_candidate_denominator() -> None:
    profile = _profile({"id": [f"a{index}" if index < 19 else None for index in range(20)], "account_id": [f"b{index}" for index in range(20)]})
    dimension = _dimensions(evaluate_quality(profile))["structural_completeness"]
    assert (dimension.score, dimension.numerator, dimension.denominator) == (97.5, 39, 40)


def test_no_candidate_has_structural_not_applicable_and_fallback_uniqueness() -> None:
    dimensions = _dimensions(evaluate_quality(_profile({"name": ["a", "a", "b"]})))
    assert dimensions["structural_completeness"].applicability is Applicability.NOT_APPLICABLE
    assert dimensions["uniqueness"].score == 66.67


def test_candidate_duplicate_formula_and_null_exclusion() -> None:
    profile = _profile({"id": ["v0", "v0"] + [f"v{index}" for index in range(2, 100)]})
    assert _dimensions(evaluate_quality(profile))["uniqueness"].score == 99.2
    assert profile.columns[0].duplicate_excess_positions == (1,)


def test_complete_row_overlap_is_not_double_penalized() -> None:
    identifiers = ["1", "1", "2", "3"] + [str(index) for index in range(4, 100)]
    profile = _profile({"id": identifiers, "note": ["same", "same"] + [f"n{index}" for index in range(2, 100)]})
    assert profile.complete_duplicate_excess_positions == (1,)
    assert profile.columns[0].duplicate_excess_positions == (1,)
    assert _dimensions(evaluate_quality(profile))["uniqueness"].score == 99.2


def test_partial_overlap_uses_only_uncovered_positions_from_profile_support() -> None:
    profile = _profile({"id": [f"v{index}" for index in range(100)]})
    column = replace(profile.columns[0], duplicate_excess_rows=1, duplicate_excess_positions=(10,))
    profile = replace(profile, columns=(column,), duplicate_excess_row_count=2, complete_duplicate_excess_positions=(10, 20))
    assert _dimensions(evaluate_quality(profile))["uniqueness"].score == 99.0


def test_validity_and_consistency_follow_profiled_structural_signals() -> None:
    validity = _dimensions(evaluate_quality(_profile({"value": [str(index) for index in range(98)] + ["bad", "also_bad"]})))["validity"]
    assert (validity.applicability, validity.score) == (Applicability.APPLICABLE, 98.0)
    consistency = _dimensions(evaluate_quality(_profile({"value": ["1"] * 10 + ["+2"] * 10})))["consistency"]
    assert consistency.score == 50.0


def test_weighting_zero_rows_bounds_and_determinism() -> None:
    zero = evaluate_quality(_profile({"id": []}))
    assert zero.overall_score is None and all(item.applicability is Applicability.INSUFFICIENT_DATA for item in zero.dimensions)
    profile = _profile({"id": [f"v{index}" for index in range(100)]})
    first, second = evaluate_quality(profile), evaluate_quality(profile)
    assert first == second and first.overall_score == 100
    assert all(item.score is None or 0 <= item.score <= 100 for item in first.dimensions)
