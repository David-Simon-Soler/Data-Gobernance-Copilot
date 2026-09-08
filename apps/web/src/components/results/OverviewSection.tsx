import { useMemo } from "react";
import { label } from "../../lib/format";
import type { AnalysisResponse, Severity } from "../../types/api";

const ATTENTION_SEVERITIES: Exclude<Severity, "INFO">[] = [
  "CRITICAL",
  "HIGH",
  "WARNING",
];

export function OverviewSection({
  response,
}: {
  response: AnalysisResponse;
}) {
  const { metadata, analysis, schema_version: schemaVersion } = response;
  const { profiling, quality, governance, recommendations } = analysis;

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
      <h2 id="overview-title" className="visually-hidden">Overview</h2>

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
