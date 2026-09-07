# Dominio V0.1

## Ownership and immutability

Each analysis creates separate immutable domain values:

`IngestedDataset -> DatasetProfile -> QualityScore + GovernanceAssessment -> RecommendationSet -> AnalysisResponse`.

The dataclasses used by Profiling, Quality, Governance and Recommendations are frozen. An engine consumes the preceding value and does not mutate it. The HTTP response serializes each result under its own `analysis` key; it does not merge them into a mutable aggregate.

Governance classifications are canonically stored in `GovernanceAssessment.classifications`. `ColumnProfile.classifications` is an empty compatibility field in the current profiling schema, not canonical governance storage. The frontend joins governance classifications to profile columns by stable `column_id`.

## Shared enums and value objects

- `AssertionLevel`: `DETECTED`, `INFERRED`, `SUGGESTED`.
- `Severity`: `INFO`, `WARNING`, `HIGH`, `CRITICAL`.
- `Confidence`: `LOW`, `MEDIUM`, `HIGH`.
- `Applicability`: `APPLICABLE`, `NOT_APPLICABLE`, `INSUFFICIENT_DATA`.
- `RecommendationPriority`: `P0`, `P1`, `P2`.
- `PrimitiveType`: `NULL`, `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `DATE`, `DATETIME`.

`NOT_APPLICABLE` means a quality dimension has no structural subject in this dataset. `INSUFFICIENT_DATA` means that it could apply but there are too few observations. Neither is a confidence value.

## Implemented contracts

### DatasetProfile

`DatasetProfile` contains row/column counts, ordered `columns`, complete-row duplicate metrics, structural candidate identifiers, profiling findings and evidence, profiling metadata and `model_version`. Internal duplicate-excess positions support deterministic Quality scoring and are not serialized by the public API.

It does not contain Quality scores, Governance classifications or Recommendations.

### ColumnProfile

A column profile contains:

- stable `column_id` and zero-based `position`;
- name, physical dtype and inferred primitive type;
- row, non-null, null, distinct, uniqueness and cardinality metrics;
- duplicate-excess, constant and all-null signals;
- an optional structural `CandidateIdentifier`;
- safe aggregate `BasicStatistics`;
- profiling finding ids and Quality parser signals.

`nullable` records observed missingness, not a business requirement. A candidate identifier is a structural inference, never a confirmed primary key. Raw values and samples are not part of the contract.

### QualityScore

`QualityScore` contains `overall_score`, the four ordered dimensions, applied weights, applicability, reasons for non-applicability or insufficient data, observed completeness, Quality findings/evidence and `model_version: "0.1"`.

A dimension has a score only when `APPLICABLE`. Observed dataset completeness is factual coverage across all cells; scored structural completeness applies only to structural candidate identifiers. See [QUALITY_MODEL.md](QUALITY_MODEL.md).

### GovernanceAssessment

`GovernanceAssessment` is the canonical governance output: ordered `classifications`, governance `findings`, governance `evidence`, an aggregate `summary` and `model_version: "0.1"`.

Each classification has an id, `column_id`, category, `INFERRED` assertion level, confidence, deterministic flag, method, rule version, signals and evidence ids. It is derived from `DatasetProfile` without raw cell access and is not written back into the profile.

### RecommendationSet

`RecommendationSet` contains ordered recommendations, count summaries and `model_version: "0.1"`. Every recommendation references one existing Quality or Governance finding, identifies its source, uses priority `P0`, `P1` or `P2`, and has `assertion_level: SUGGESTED`.

A recommendation does not increase finding severity, promote an inference to fact or create evidence.

### Finding and Evidence

A `Finding` has a stable id, assertion level, severity, confidence, category, subject, title, description, method and evidence ids. A `Recommendation` points to a finding; findings do not depend on a recommendation being generated.

`Evidence` records a rule and version, subject, metric, aggregate observed value, optional denominator/affected count, sample policy and safe structural details. It never contains the whole dataset or raw cells. `DETECTED` facts and canonical evidence are deterministic; a future LLM cannot create or mutate them.

### AnalysisResponse

The HTTP envelope has `schema_version: "0.1"`, safe source metadata and four separate payloads: `profiling`, `quality`, `governance` and `recommendations`. Bytes, DataFrames, raw rows, raw cell values, samples and temporary paths are excluded.

## Invariants

- Engine inputs remain unchanged; outputs are deterministic for the same supported input and model version.
- Every finding references evidence owned by the same engine result.
- Every recommendation references an existing Quality or Governance finding.
- Severity expresses impact; confidence expresses certainty; priority orders a suggested action.
- `INFERRED` and `SUGGESTED` values do not feed deterministic Quality metrics or scores.
- Governance signals require human review and do not establish legal status.
- Optional future AI remains advisory and cannot replace canonical deterministic output.
