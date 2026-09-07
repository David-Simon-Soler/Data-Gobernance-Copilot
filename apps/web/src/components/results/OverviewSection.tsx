"use client";

import { useEffect, useMemo, useRef } from "react";
import { label } from "../../lib/format";
import type { AnalysisResponse, Severity } from "../../types/api";

const ATTENTION_SEVERITIES: Exclude<Severity, "INFO">[] = [
  "CRITICAL",
  "HIGH",
  "WARNING",
];

export function OverviewSection({
  response,
  isSyntheticDemo,
}: {
  response: AnalysisResponse;
  isSyntheticDemo: boolean;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const { metadata, analysis, schema_version: schemaVersion } = response;
  const { profiling, quality, governance, recommendations } = analysis;

  useEffect(() => {
    title.current?.focus();
  }, []);

  const attentionCounts = useMemo(() => {
    const findings = [
      ...profiling.findings,
      ...quality.findings,
      ...governance.findings,
    ];

    return ATTENTION_SEVERITIES.map((severity) => ({
      severity,
      count: findings.filter((finding) => finding.severity === severity).length,
    })).filter(({ count }) => count > 0);
  }, [governance.findings, profiling.findings, quality.findings]);

  return (
    <section id="overview" className="overview" aria-labelledby="overview-title">
      <div className="overview-heading">
        <div>
          <p className="eyebrow status-label">Analysis complete</p>
          {isSyntheticDemo ? (
            <p className="synthetic-result-label">Synthetic sample dataset</p>
          ) : null}
          <h1
            ref={title}
            id="overview-title"
            tabIndex={-1}
            title={metadata.source_filename}
          >
            {metadata.source_filename}
          </h1>
          <p className="dataset-context">
            <span>{metadata.source_format.toUpperCase()}</span>
            {metadata.sheet_name ? <span>Sheet: {metadata.sheet_name}</span> : null}
            <span>{metadata.row_count.toLocaleString()} rows</span>
            <span>{metadata.column_count.toLocaleString()} columns</span>
          </p>
        </div>
        <div className="quality-summary" role="group" aria-label="Overall structural quality">
          <span>Overall structural quality</span>
          <div className="overview-score">
            <strong>{quality.overall_score ?? "N/A"}</strong>
            {quality.overall_score == null ? (
              <span>Not applicable</span>
            ) : (
              <span>/ 100</span>
            )}
          </div>
        </div>
      </div>

      <div className="review-summary" role="group" aria-label="Review summary">
        <div>
          <strong>{quality.findings.length.toLocaleString()}</strong>
          <span>Quality findings</span>
        </div>
        <div>
          <strong>{governance.classifications.length.toLocaleString()}</strong>
          <span>Governance classifications</span>
        </div>
        <div>
          <strong>{recommendations.summary.total_count.toLocaleString()}</strong>
          <span>Recommendations</span>
        </div>
      </div>

      <div className="attention-summary">
        {attentionCounts.length ? (
          <>
            <strong>Findings requiring attention</strong>
            <div className="severity-counts">
              {attentionCounts.map(({ severity, count }) => (
                <span
                  className={`severity-count ${severity.toLowerCase()}`}
                  key={severity}
                >
                  {count.toLocaleString()} {label(severity)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p>
            No Warning, High or Critical findings were produced by the current
            V0.1 rules.
          </p>
        )}
      </div>

      {metadata.warnings.length ? (
        <div className="warning overview-warning" role="status">
          <strong>Ingestion warnings</strong>
          {metadata.warnings.map((warning, index) => (
            <p key={`${index}-${warning}`}>{warning}</p>
          ))}
        </div>
      ) : null}

      <details className="analysis-details">
        <summary>Analysis details</summary>
        <dl>
          <div>
            <dt>Response schema</dt>
            <dd><code>{schemaVersion}</code></dd>
          </div>
          <div>
            <dt>Profiling model</dt>
            <dd><code>{profiling.model_version}</code></dd>
          </div>
          {profiling.profiling_metadata?.profiling_method ? (
            <div>
              <dt>Profiling method</dt>
              <dd><code>{profiling.profiling_metadata.profiling_method}</code></dd>
            </div>
          ) : null}
          <div>
            <dt>Quality model</dt>
            <dd><code>{quality.model_version}</code></dd>
          </div>
          <div>
            <dt>Governance model</dt>
            <dd><code>{governance.model_version}</code></dd>
          </div>
          <div>
            <dt>Recommendation model</dt>
            <dd><code>{recommendations.model_version}</code></dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
