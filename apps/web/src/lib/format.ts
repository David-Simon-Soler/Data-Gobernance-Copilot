const QUALITY_REASONS: Record<string, string> = {
  empty_dataset: "The dataset has no rows to assess.",
  fewer_than_two_rows: "At least two rows are required for this check.",
  fewer_than_10_valid_non_null_values:
    "Fewer than 10 valid non-null values were available for this check.",
  no_structural_candidate_identifier:
    "No structural candidate identifier met the current rule thresholds.",
  no_typed_columns:
    "No columns had a recognized type that the current V0.1 rule can assess.",
  no_recognized_format_family:
    "No recognized format family was available for this check.",
};

export const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;

export const pct = (value: number | null | undefined) =>
  value == null ? "—" : `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;

export const scorePercent = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `${(Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1).replace(/\.0$/, "")}%`;

export const qualityReason = (reason: string | null | undefined) => {
  if (!reason) return null;
  return (
    QUALITY_REASONS[reason] ??
    "The current V0.1 rule could not produce an applicable score for this check."
  );
};

const RATIO_METRIC = /(?:^|_)(?:ratio|rate|proportion)$/;

export const evidenceValue = (
  metric: string,
  value: number | string | boolean,
) => {
  if (typeof value === "number" && RATIO_METRIC.test(metric.toLowerCase())) {
    return pct(value);
  }
  return typeof value === "number" ? value.toLocaleString() : String(value);
};
