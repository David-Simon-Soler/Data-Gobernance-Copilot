"use client";

import { useEffect, useRef } from "react";
import { scorePercent } from "../../lib/format";
import type { AnalysisResponse } from "../../types/api";

interface DatasetContextHeaderProps {
  response: AnalysisResponse;
  isSyntheticDemo: boolean;
}

export function DatasetContextHeader({
  response,
  isSyntheticDemo,
}: DatasetContextHeaderProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const { metadata, analysis } = response;
  const { quality, governance, recommendations } = analysis;

  useEffect(() => {
    title.current?.focus();
  }, []);

  const metrics = [
    {
      label: "Structural quality",
      value: quality.overall_score ?? "N/A",
      suffix: quality.overall_score == null ? "Not applicable" : "/ 100",
    },
    {
      label: "Observed completeness",
      value:
        quality.observed_completeness == null
          ? "N/A"
          : scorePercent(quality.observed_completeness),
      suffix:
        quality.observed_completeness == null ? "Not applicable" : undefined,
    },
    {
      label: "Quality findings",
      value: quality.findings.length.toLocaleString(),
    },
    {
      label: "Governance classifications",
      value: governance.classifications.length.toLocaleString(),
    },
    {
      label: "Recommendations",
      value: recommendations.summary.total_count.toLocaleString(),
    },
  ];

  return (
    <section className="dataset-header" aria-labelledby="dataset-title">
      <div className="dataset-header-inner">
        <div className="dataset-identity">
          <div>
            <p className="eyebrow status-label">Analysis complete</p>
            {isSyntheticDemo ? (
              <p className="synthetic-result-label">Synthetic sample dataset</p>
            ) : null}
            <h1
              ref={title}
              id="dataset-title"
              tabIndex={-1}
              title={metadata.source_filename}
            >
              {metadata.source_filename}
            </h1>
          </div>
          <span className="format-badge">{metadata.source_format.toUpperCase()}</span>
        </div>

        <p className="dataset-context">
          {metadata.sheet_name ? <span>Sheet: {metadata.sheet_name}</span> : null}
          <span>{metadata.row_count.toLocaleString()} rows</span>
          <span>{metadata.column_count.toLocaleString()} columns</span>
        </p>

        <div className="dataset-metrics" role="group" aria-label="Review summary">
          {metrics.map((metric) => (
            <div
              className="dataset-metric"
              key={metric.label}
              role="group"
              aria-label={
                metric.label === "Structural quality"
                  ? "Overall structural quality"
                  : metric.label
              }
            >
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              {metric.suffix ? <small>{metric.suffix}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
