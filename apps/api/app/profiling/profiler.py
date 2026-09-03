import polars as pl

from app.ingestion.models import IngestedDataset

from .identifiers import detect_candidate_identifier
from .models import AssertionLevel, CandidateIdentifier, ColumnProfile, Confidence, DatasetProfile, Evidence, Finding, ProfilingMetadata, Severity
from .quality_signals import collect_quality_signals
from .statistics import calculate_statistics
from .type_inference import infer_primitive_type


def profile_dataset(ingested: IngestedDataset) -> DatasetProfile:
    frame = ingested.dataframe
    duplicate_row_count, duplicate_excess, duplicate_groups, duplicate_positions = _duplicate_row_metrics(frame)
    columns, findings, evidence = [], [], []
    if duplicate_excess:
        finding, item = _dataset_duplicate_finding(duplicate_row_count, duplicate_excess)
        findings.append(finding); evidence.append(item)
    for position, name in enumerate(frame.columns):
        column, items, item_evidence = _profile_column(frame.get_column(name), position, frame.height)
        columns.append(column); findings.extend(items); evidence.extend(item_evidence)
    candidates = tuple(column.candidate_identifier for column in columns if column.candidate_identifier is not None)
    return DatasetProfile(frame.height, frame.width, tuple(columns), duplicate_row_count, duplicate_excess, duplicate_groups, candidates, tuple(findings), tuple(evidence), ProfilingMetadata(ingested.source_filename, ingested.source_format.value), complete_duplicate_excess_positions=duplicate_positions)


def _profile_column(series: pl.Series, position: int, row_count: int) -> tuple[ColumnProfile, list[Finding], list[Evidence]]:
    non_null = series.drop_nulls(); values = non_null.to_list(); non_null_count = non_null.len()
    null_count = row_count - non_null_count; distinct_count = non_null.n_unique()
    uniqueness = distinct_count / non_null_count if non_null_count else None
    candidate = detect_candidate_identifier(series.name, row_count, non_null_count, uniqueness)
    column_id, findings, evidence, finding_ids = f"col:{position}", [], [], []
    is_all_null = row_count > 0 and non_null_count == 0
    if is_all_null:
        finding, item = _column_metric_finding(column_id, position, "all_null", Severity.WARNING, "Column has only null values", null_count, row_count)
        findings.append(finding); evidence.append(item); finding_ids.append(finding.id)
    elif non_null_count > 0 and distinct_count == 1:
        finding, item = _column_metric_finding(column_id, position, "constant_column", Severity.INFO, "Column has one distinct non-null value", distinct_count, non_null_count)
        findings.append(finding); evidence.append(item); finding_ids.append(finding.id)
    if candidate is not None:
        finding, item = _candidate_identifier_finding(column_id, position, row_count, candidate)
        findings.append(finding); evidence.append(item); finding_ids.append(finding.id)
    primitive = infer_primitive_type(values)
    return ColumnProfile(column_id, series.name, position, str(series.dtype), primitive, null_count > 0, row_count, non_null_count, null_count, null_count / row_count if row_count else 0.0, distinct_count, uniqueness, uniqueness, non_null_count - distinct_count, non_null_count > 0 and distinct_count == 1, is_all_null, candidate is not None, candidate.reason if candidate else None, candidate, calculate_statistics(series, primitive), (), tuple(finding_ids), collect_quality_signals(values), _column_duplicate_excess_positions(series) if candidate is not None else ()), findings, evidence


def _duplicate_row_metrics(frame: pl.DataFrame) -> tuple[int, int, int, tuple[int, ...]]:
    if frame.is_empty() or frame.width == 0:
        return 0, 0, 0, ()
    positions, sizes = _duplicate_groups(frame, frame.columns)
    return sum(sizes), len(positions), len(sizes), positions


def _column_duplicate_excess_positions(series: pl.Series) -> tuple[int, ...]:
    frame = pl.DataFrame({"_value": series}).with_row_index("_quality_row_position").filter(pl.col("_value").is_not_null())
    if frame.is_empty():
        return ()
    groups = frame.group_by("_value", maintain_order=True).agg(pl.col("_quality_row_position")).filter(pl.col("_quality_row_position").list.len() > 1)
    return tuple(position for group in groups.get_column("_quality_row_position").to_list() for position in group[1:])


def _duplicate_groups(frame: pl.DataFrame, columns: list[str]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    indexed = frame.with_row_index("_quality_row_position")
    groups = indexed.group_by(columns, maintain_order=True).agg(pl.col("_quality_row_position")).filter(pl.col("_quality_row_position").list.len() > 1)
    grouped_positions = groups.get_column("_quality_row_position").to_list() if groups.height else []
    return tuple(position for group in grouped_positions for position in group[1:]), tuple(len(group) for group in grouped_positions)


def _dataset_duplicate_finding(duplicate_row_count: int, duplicate_excess: int) -> tuple[Finding, Evidence]:
    evidence = Evidence("E-DATASET-DUPLICATE-ROWS", "metric", "dataset", "complete_row_duplicates_v0_1", "0.1", "duplicate_excess_row_count", duplicate_excess, affected_rows=duplicate_row_count)
    finding = Finding("F-DATASET-DUPLICATE-ROWS", AssertionLevel.DETECTED, Severity.WARNING, Confidence.HIGH, "duplicate_record", "dataset", "Complete duplicate rows detected", "Complete row duplicates were measured deterministically.", "complete_row_duplicates_v0_1", (evidence.id,))
    return finding, evidence


def _column_metric_finding(column_id: str, position: int, category: str, severity: Severity, title: str, observed: int, denominator: int) -> tuple[Finding, Evidence]:
    suffix = category.upper(); evidence = Evidence(f"E-COL-{position}-{suffix}", "metric", column_id, f"{category}_v0_1", "0.1", category, observed, denominator, observed)
    return Finding(f"F-COL-{position}-{suffix}", AssertionLevel.DETECTED, severity, Confidence.HIGH, category, column_id, title, "Structural profile measurement.", f"{category}_v0_1", (evidence.id,)), evidence


def _candidate_identifier_finding(column_id: str, position: int, row_count: int, candidate: CandidateIdentifier) -> tuple[Finding, Evidence]:
    details: tuple[tuple[str, int | float | str | bool], ...] = (("row_count", row_count), ("completeness", candidate.completeness), ("uniqueness", candidate.uniqueness), ("name_signal", candidate.name_signal), ("matched_rule", candidate.reason), ("rule_version", "0.1"), *candidate.thresholds)
    evidence = Evidence(f"E-COL-{position}-CANDIDATE-IDENTIFIER", "metric", column_id, "candidate_identifier_v0_1", "0.1", "candidate_identifier_rule_match", candidate.reason, details=details)
    finding = Finding(f"F-COL-{position}-CANDIDATE-IDENTIFIER", AssertionLevel.INFERRED, Severity.INFO, Confidence.HIGH, "candidate_identifier", column_id, "Structural candidate identifier inferred", "This is not a confirmed primary key or semantic identifier.", "candidate_identifier_v0_1", (evidence.id,))
    return finding, evidence
