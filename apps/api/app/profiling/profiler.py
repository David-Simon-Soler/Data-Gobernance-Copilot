import polars as pl

from app.ingestion.models import IngestedDataset

from .identifiers import detect_candidate_identifier
from .models import AssertionLevel, CandidateIdentifier, ColumnProfile, Confidence, DatasetProfile, Evidence, Finding, ProfilingMetadata, Severity
from .statistics import calculate_statistics
from .type_inference import infer_primitive_type


def profile_dataset(ingested: IngestedDataset) -> DatasetProfile:
    dataframe = ingested.dataframe
    duplicate_row_count, duplicate_excess, duplicate_groups = _duplicate_row_metrics(dataframe)
    columns: list[ColumnProfile] = []
    findings: list[Finding] = []
    evidence: list[Evidence] = []
    if duplicate_excess:
        finding, item = _dataset_duplicate_finding(duplicate_row_count, duplicate_excess)
        findings.append(finding)
        evidence.append(item)
    for position, name in enumerate(dataframe.columns):
        column, items, item_evidence = _profile_column(dataframe.get_column(name), position, dataframe.height)
        columns.append(column)
        findings.extend(items)
        evidence.extend(item_evidence)
    candidates = tuple(column.candidate_identifier for column in columns if column.candidate_identifier is not None)
    return DatasetProfile(dataframe.height, dataframe.width, tuple(columns), duplicate_row_count, duplicate_excess, duplicate_groups, candidates, tuple(findings), tuple(evidence), ProfilingMetadata(ingested.source_filename, ingested.source_format.value))


def _profile_column(series: pl.Series, position: int, row_count: int) -> tuple[ColumnProfile, list[Finding], list[Evidence]]:
    non_null = series.drop_nulls()
    non_null_count = non_null.len()
    null_count = row_count - non_null_count
    distinct_count = non_null.n_unique()
    uniqueness = distinct_count / non_null_count if non_null_count else None
    candidate = detect_candidate_identifier(series.name, row_count, non_null_count, uniqueness)
    column_id = f"col:{position}"
    findings: list[Finding] = []
    evidence: list[Evidence] = []
    finding_ids: list[str] = []
    is_all_null = row_count > 0 and non_null_count == 0
    if is_all_null:
        finding, item = _column_metric_finding(column_id, position, "all_null", Severity.WARNING, "Column has only null values", null_count, row_count)
        findings.append(finding)
        evidence.append(item)
        finding_ids.append(finding.id)
    elif non_null_count > 0 and distinct_count == 1:
        finding, item = _column_metric_finding(column_id, position, "constant_column", Severity.INFO, "Column has one distinct non-null value", distinct_count, non_null_count)
        findings.append(finding)
        evidence.append(item)
        finding_ids.append(finding.id)
    if candidate is not None:
        finding, item = _candidate_identifier_finding(column_id, position, row_count, candidate)
        findings.append(finding)
        evidence.append(item)
        finding_ids.append(finding.id)
    primitive_type = infer_primitive_type(non_null.to_list())
    return ColumnProfile(
        column_id, series.name, position, str(series.dtype), primitive_type, null_count > 0, row_count,
        non_null_count, null_count, null_count / row_count if row_count else 0.0, distinct_count,
        uniqueness, uniqueness, non_null_count - distinct_count, non_null_count > 0 and distinct_count == 1,
        is_all_null, candidate is not None, candidate.reason if candidate else None, candidate,
        calculate_statistics(series, primitive_type), (), tuple(finding_ids),
    ), findings, evidence


def _duplicate_row_metrics(dataframe: pl.DataFrame) -> tuple[int, int, int]:
    if dataframe.is_empty() or dataframe.width == 0:
        return 0, 0, 0
    groups = dataframe.group_by(dataframe.columns, maintain_order=True).len().filter(pl.col("len") > 1)
    if groups.is_empty():
        return 0, 0, 0
    duplicate_row_count = int(groups.get_column("len").sum())
    return duplicate_row_count, duplicate_row_count - groups.height, groups.height


def _dataset_duplicate_finding(duplicate_row_count: int, duplicate_excess: int) -> tuple[Finding, Evidence]:
    evidence = Evidence("E-DATASET-DUPLICATE-ROWS", "metric", "dataset", "complete_row_duplicates_v0_1", "0.1", "duplicate_excess_row_count", duplicate_excess, affected_rows=duplicate_row_count)
    finding = Finding("F-DATASET-DUPLICATE-ROWS", AssertionLevel.DETECTED, Severity.WARNING, Confidence.HIGH, "duplicate_record", "dataset", "Complete duplicate rows detected", "Complete row duplicates were measured deterministically.", "complete_row_duplicates_v0_1", (evidence.id,))
    return finding, evidence


def _column_metric_finding(column_id: str, position: int, category: str, severity: Severity, title: str, observed: int, denominator: int) -> tuple[Finding, Evidence]:
    suffix = category.upper()
    evidence = Evidence(f"E-COL-{position}-{suffix}", "metric", column_id, f"{category}_v0_1", "0.1", category, observed, denominator, observed)
    finding = Finding(f"F-COL-{position}-{suffix}", AssertionLevel.DETECTED, severity, Confidence.HIGH, category, column_id, title, "Structural profile measurement.", f"{category}_v0_1", (evidence.id,))
    return finding, evidence


def _candidate_identifier_finding(column_id: str, position: int, row_count: int, candidate: CandidateIdentifier) -> tuple[Finding, Evidence]:
    details: tuple[tuple[str, int | float | str | bool], ...] = (
        ("row_count", row_count), ("completeness", candidate.completeness), ("uniqueness", candidate.uniqueness),
        ("name_signal", candidate.name_signal), ("matched_rule", candidate.reason), ("rule_version", "0.1"),
        *candidate.thresholds,
    )
    evidence = Evidence(f"E-COL-{position}-CANDIDATE-IDENTIFIER", "metric", column_id, "candidate_identifier_v0_1", "0.1", "candidate_identifier_rule_match", candidate.reason, details=details)
    finding = Finding(f"F-COL-{position}-CANDIDATE-IDENTIFIER", AssertionLevel.INFERRED, Severity.INFO, Confidence.HIGH, "candidate_identifier", column_id, "Structural candidate identifier inferred", "This is not a confirmed primary key or semantic identifier.", "candidate_identifier_v0_1", (evidence.id,))
    return finding, evidence
