import polars as pl

from app.ingestion.models import IngestedDataset, IngestionMetadata, SourceFormat
from app.profiling import profile_dataset
from app.profiling.models import Applicability
from app.quality import evaluate_quality


def _score(data: dict[str, list[object]]):
    frame = pl.DataFrame(data, strict=False)
    profile = profile_dataset(IngestedDataset("synthetic.csv", SourceFormat.CSV, None, frame.height, frame.width, tuple(frame.columns), frame, (), IngestionMetadata(",")))
    return evaluate_quality(profile)


def test_only_completeness_and_uniqueness_receive_their_canonical_weights() -> None:
    score = _score({"id": [f"id-{index}" for index in range(10)]})
    assert score.applied_weights == (("structural_completeness", 35), ("uniqueness", 25))
    assert score.overall_score == 100


def test_multiple_identifier_duplicate_rates_are_averaged() -> None:
    first = ["a0", "a0"] + [f"a{index}" for index in range(2, 101)]
    second = ["b0", "b0", "b0"] + [f"b{index}" for index in range(3, 101)]
    score = _score({"id": first, "account_id": second})
    uniqueness = next(item for item in score.dimensions if item.name == "uniqueness")
    assert uniqueness.score == 98.81


def test_validity_and_consistency_not_applicable_do_not_receive_weight() -> None:
    score = _score({"id": [f"opaque-{index}" for index in range(10)]})
    applicability = dict(score.applicability)
    assert applicability["validity"] is Applicability.NOT_APPLICABLE
    assert applicability["consistency"] is Applicability.NOT_APPLICABLE
    assert dict(score.applied_weights) == {"structural_completeness": 35, "uniqueness": 25}
