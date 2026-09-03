from .models import CandidateIdentifier

_EXACT_IDENTIFIER_NAMES = frozenset({"id", "identifier", "uuid", "guid"})
_NAME_THRESHOLDS: tuple[tuple[str, int | float], ...] = (("min_row_count", 10), ("min_completeness", 0.95), ("min_uniqueness", 0.98))
_STRUCTURAL_THRESHOLDS: tuple[tuple[str, int | float], ...] = (("min_row_count", 100), ("min_completeness", 0.99), ("min_uniqueness", 0.999))


def detect_candidate_identifier(
    name: str, row_count: int, non_null_count: int, uniqueness_ratio: float | None
) -> CandidateIdentifier | None:
    if row_count == 0 or uniqueness_ratio is None:
        return None
    completeness = non_null_count / row_count
    normalized_name = name.casefold()
    name_signal = normalized_name in _EXACT_IDENTIFIER_NAMES or normalized_name.endswith("_id")
    if name_signal and row_count >= 10 and completeness >= 0.95 and uniqueness_ratio >= 0.98:
        return CandidateIdentifier("STRUCTURAL_CANDIDATE_IDENTIFIER", "name_signal_thresholds_v0_1", True, completeness, uniqueness_ratio, _NAME_THRESHOLDS)
    if not name_signal and row_count >= 100 and completeness >= 0.99 and uniqueness_ratio >= 0.999:
        return CandidateIdentifier("STRUCTURAL_CANDIDATE_IDENTIFIER", "structural_thresholds_v0_1", False, completeness, uniqueness_ratio, _STRUCTURAL_THRESHOLDS)
    return None
