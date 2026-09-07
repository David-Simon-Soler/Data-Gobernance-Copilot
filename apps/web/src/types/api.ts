export type AssertionLevel = "DETECTED" | "INFERRED" | "SUGGESTED";
export type Severity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type Applicability =
  | "APPLICABLE"
  | "NOT_APPLICABLE"
  | "INSUFFICIENT_DATA";

export interface Evidence {
  id: string;
  type: string;
  subject: string;
  rule_id: string;
  rule_version: string;
  metric: string;
  observed_value: number | string | boolean;
  denominator?: number | null;
  affected_rows?: number | null;
  sample_policy?: string;
  details?: Array<[string, number | string | boolean]>;
}

export interface Finding {
  id: string;
  assertion_level: AssertionLevel;
  severity: Severity;
  confidence: Confidence;
  category: string;
  subject: string;
  title: string;
  description: string;
  method: string;
  evidence_ids: string[];
  recommendation_ids?: string[];
}

export interface ColumnProfile {
  column_id: string;
  name: string;
  position: number;
  physical_dtype: string;
  inferred_primitive_type: string;
  nullable: boolean;
  row_count: number;
  non_null_count: number;
  null_count: number;
  null_ratio: number;
  distinct_count: number;
  uniqueness_ratio: number | null;
  cardinality_ratio: number | null;
  duplicate_excess_rows: number;
  is_constant: boolean;
  is_all_null: boolean;
  is_candidate_identifier: boolean;
  candidate_identifier_reason?: string | null;
  candidate_identifier?: CandidateIdentifier | null;
  classifications: string[];
  findings: string[];
  basic_statistics?: Record<string, number | string | null> | null;
  quality_signals?: QualityColumnSignals | null;
}

export interface CandidateIdentifier {
  kind: string;
  reason: string;
  name_signal: boolean;
  completeness: number;
  uniqueness: number;
  thresholds: Array<[string, number]>;
  confirmed_key: boolean;
}

export interface QualityColumnSignals {
  primitive_type: string;
  non_null_count: number;
  invalid_count: number;
  valid_non_null_count: number;
  format_family_counts: Array<[string, number]>;
  has_recognized_format_family: boolean;
}

export interface QualityDimension {
  name: string;
  score: number | null;
  applicability: Applicability;
  reason?: string | null;
  numerator?: number | null;
  denominator?: number | null;
}

export interface GovernanceClassification {
  id: string;
  column_id: string;
  category: string;
  assertion_level: AssertionLevel;
  confidence: Confidence;
  deterministic: boolean;
  method: string;
  rule_version: string;
  signals: GovernanceSignal[];
  evidence_ids: string[];
}

export interface GovernanceSignal {
  id: string;
  source: string;
  signal_type: string;
  strength: number;
  deterministic: boolean;
  rule_id: string;
  rule_version: string;
  evidence_id: string;
}

export interface Recommendation {
  id: string;
  finding_id: string;
  source: "QUALITY" | "GOVERNANCE";
  priority: "P0" | "P1" | "P2";
  category: string;
  action: string;
  rationale: string;
  assertion_level: AssertionLevel;
  rule_id: string;
  model_version: string;
}

export interface RecommendationSummary {
  total_count: number;
  counts_by_priority: Array<[Recommendation["priority"], number]>;
  counts_by_category: Array<[string, number]>;
}

export interface AnalysisResponse {
  schema_version: string;

  metadata: {
    source_filename: string;
    source_format: string;
    sheet_name?: string | null;
    row_count: number;
    column_count: number;
    warnings: string[];
  };

  analysis: {
    profiling: Record<string, unknown> & {
      row_count: number;
      column_count: number;
      columns: ColumnProfile[];
      findings: Finding[];
      evidence: Evidence[];
      profiling_metadata: {
        source_filename: string;
        source_format: string;
        profiling_method: string;
      };
      model_version: string;
    };

    quality: Record<string, unknown> & {
      overall_score: number | null;
      observed_completeness: number | null;
      dimensions: QualityDimension[];
      applied_weights: Array<[string, number]>;
      findings: Finding[];
      evidence: Evidence[];
      model_version: string;
    };

    governance: Record<string, unknown> & {
      classifications: GovernanceClassification[];
      findings: Finding[];
      evidence: Evidence[];
      summary: {
        classified_column_count: number;
        columns_with_potential_personal_data: string[];
        category_counts: Array<[string, number]>;
      };
      model_version: string;
    };

    recommendations: Record<string, unknown> & {
      recommendations: Recommendation[];
      summary: RecommendationSummary;
      model_version: string;
    };
  };
}

export interface ApiError extends Error {
  code: string;
  status?: number;
}
