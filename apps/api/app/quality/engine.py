from app.profiling.models import Applicability, AssertionLevel, Confidence, DatasetProfile, Evidence, Finding, PrimitiveType, Severity

from .models import QualityDimension, QualityScore

_WEIGHTS = (("structural_completeness", 35), ("uniqueness", 25), ("validity", 25), ("consistency", 15))
_TYPED = frozenset({PrimitiveType.BOOLEAN, PrimitiveType.INTEGER, PrimitiveType.FLOAT, PrimitiveType.DATE, PrimitiveType.DATETIME})


def evaluate_quality(profile: DatasetProfile) -> QualityScore:
    if profile.row_count == 0:
        dimensions = tuple(_dimension(name, None, Applicability.INSUFFICIENT_DATA, "empty_dataset") for name, _ in _WEIGHTS)
        return _score(dimensions, None, (), ())
    validity, findings, evidence = _validity(profile)
    dimensions = (_structural_completeness(profile), _uniqueness(profile), validity, _consistency(profile))
    return _score(dimensions, _observed_completeness(profile), findings, evidence)


def _structural_completeness(profile: DatasetProfile) -> QualityDimension:
    candidates = [column for column in profile.columns if column.is_candidate_identifier]
    if not candidates:
        return _dimension("structural_completeness", None, Applicability.NOT_APPLICABLE, "no_structural_candidate_identifier")
    nulls = sum(column.null_count for column in candidates)
    denominator = profile.row_count * len(candidates)
    return _dimension("structural_completeness", _percent(1 - nulls / denominator), Applicability.APPLICABLE, None, denominator - nulls, denominator)


def _uniqueness(profile: DatasetProfile) -> QualityDimension:
    candidates = [column for column in profile.columns if column.is_candidate_identifier and column.non_null_count > 0]
    if candidates:
        identifier_rate = sum(column.duplicate_excess_rows / column.non_null_count for column in candidates) / len(candidates)
        identifier_excess_positions = {position for column in candidates for position in column.duplicate_excess_positions}
        uncovered = sum(position not in identifier_excess_positions for position in profile.complete_duplicate_excess_positions)
        penalty = min(1.0, 0.8 * identifier_rate + 0.2 * (uncovered / profile.row_count))
        return _dimension("uniqueness", _percent(1 - penalty), Applicability.APPLICABLE, None, profile.row_count - uncovered, profile.row_count)
    if profile.row_count < 2:
        return _dimension("uniqueness", None, Applicability.INSUFFICIENT_DATA, "fewer_than_two_rows")
    return _dimension("uniqueness", _percent(1 - profile.duplicate_excess_row_count / profile.row_count), Applicability.APPLICABLE, None, profile.row_count - profile.duplicate_excess_row_count, profile.row_count)


def _validity(profile: DatasetProfile) -> tuple[QualityDimension, tuple[Finding, ...], tuple[Evidence, ...]]:
    typed_columns = [column for column in profile.columns if column.quality_signals is not None and column.quality_signals.primitive_type in _TYPED]
    denominator = sum(column.quality_signals.non_null_count for column in typed_columns)
    if not denominator:
        return _dimension("validity", None, Applicability.NOT_APPLICABLE, "no_typed_columns"), (), ()
    invalid = sum(column.quality_signals.invalid_count for column in typed_columns)
    findings, evidence = zip(*(_invalid_value_finding(column) for column in typed_columns if column.quality_signals.invalid_count), strict=True) if invalid else ((), ())
    return _dimension("validity", _percent(1 - invalid / denominator), Applicability.APPLICABLE, None, denominator - invalid, denominator), tuple(findings), tuple(evidence)


def _invalid_value_finding(column) -> tuple[Finding, Evidence]:
    signal = column.quality_signals
    rule_id = "quality_validity_parser_v0_1"
    evidence = Evidence(f"E-QUALITY-COL-{column.position}-MALFORMED-VALUE", "metric", column.column_id, rule_id, "0.1", "invalid_non_null_count", signal.invalid_count, denominator=signal.non_null_count, affected_rows=signal.invalid_count, details=(("expected_primitive_type", signal.primitive_type.value), ("parser_rule", rule_id)))
    finding = Finding(f"F-QUALITY-COL-{column.position}-MALFORMED-VALUE", AssertionLevel.DETECTED, Severity.WARNING, Confidence.HIGH, "malformed_value", column.column_id, "Non-null values failed a structural parser", f"{signal.invalid_count} non-null values failed the {signal.primitive_type.value} parser used by Quality Model V0.1.", rule_id, (evidence.id,))
    return finding, evidence


def _consistency(profile: DatasetProfile) -> QualityDimension:
    signals = [column.quality_signals for column in profile.columns if column.quality_signals is not None]
    eligible = [signal for signal in signals if signal.primitive_type in _TYPED and signal.non_null_count >= 10 and signal.valid_non_null_count / signal.non_null_count >= 0.98]
    if not eligible:
        reason = "fewer_than_10_valid_non_null_values" if any(signal.has_recognized_format_family and signal.non_null_count < 10 for signal in signals) else "no_recognized_format_family"
        applicability = Applicability.INSUFFICIENT_DATA if reason.startswith("fewer") else Applicability.NOT_APPLICABLE
        return _dimension("consistency", None, applicability, reason)
    denominator = sum(signal.valid_non_null_count for signal in eligible)
    inconsistent = sum(signal.valid_non_null_count - max((count for _, count in signal.format_family_counts), default=0) for signal in eligible)
    return _dimension("consistency", _percent(1 - inconsistent / denominator), Applicability.APPLICABLE, None, denominator - inconsistent, denominator)


def _observed_completeness(profile: DatasetProfile) -> float | None:
    cells = profile.row_count * profile.column_count
    return _percent(1 - sum(column.null_count for column in profile.columns) / cells) if cells else None


def _score(dimensions: tuple[QualityDimension, ...], observed: float | None, findings: tuple[Finding, ...], evidence: tuple[Evidence, ...]) -> QualityScore:
    scores = {dimension.name: dimension for dimension in dimensions}
    applied = tuple((name, weight) for name, weight in _WEIGHTS if scores[name].applicability is Applicability.APPLICABLE)
    overall = round(sum(scores[name].score * weight for name, weight in applied) / sum(weight for _, weight in applied)) if applied else None
    reasons = tuple((dimension.name, dimension.reason) for dimension in dimensions if dimension.reason is not None)
    return QualityScore(overall, dimensions, applied, tuple((dimension.name, dimension.applicability) for dimension in dimensions), reasons, observed, findings, evidence)


def _dimension(name: str, score: float | None, applicability: Applicability, reason: str | None, numerator: int | None = None, denominator: int | None = None) -> QualityDimension:
    return QualityDimension(name, score, applicability, reason, numerator, denominator)


def _percent(value: float) -> float:
    return round(max(0.0, min(1.0, value)) * 100, 2)
