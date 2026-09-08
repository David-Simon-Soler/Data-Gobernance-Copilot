import { label, scorePercent } from "../../lib/format";
import type { AnalysisResponse, Severity } from "../../types/api";

const ATTENTION_SEVERITIES: Exclude<Severity, "INFO">[] = [
  "CRITICAL",
  "HIGH",
  "WARNING",
];
const ATTENTION_LIMIT = 6;

const countLabel = (count: number, singular: string, plural = singular + "s") =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`;

const subjectName = (
  subject: string,
  columns: AnalysisResponse["analysis"]["profiling"]["columns"],
) => columns.find((column) => column.column_id === subject)?.name ?? subject;

export function OverviewSection({
  response,
}: {
  response: AnalysisResponse;
}) {
  const { metadata, analysis, schema_version: schemaVersion } = response;
  const { profiling, quality, governance, recommendations } = analysis;
  const qualityAttention = quality.findings.filter((finding) =>
    ATTENTION_SEVERITIES.includes(finding.severity as Exclude<Severity, "INFO">),
  );
  const profilingAttention = profiling.findings.filter((finding) =>
    ATTENTION_SEVERITIES.includes(finding.severity as Exclude<Severity, "INFO">),
  );
  const attentionItems = [
    ...qualityAttention.map((finding) => ({
      id: finding.id,
      href: `#finding-${finding.id}`,
      source: "Quality",
      field: subjectName(finding.subject, profiling.columns),
      signal: finding.title,
      state: label(finding.severity),
      stateClass: finding.severity.toLowerCase(),
    })),
    ...governance.findings.map((finding) => ({
      id: finding.id,
      href: "#governance",
      source: "Governance",
      field: subjectName(finding.subject, profiling.columns),
      signal: finding.title,
      state: `Review · ${label(finding.confidence)} confidence`,
      stateClass: "review",
    })),
    ...profilingAttention.map((finding) => ({
      id: finding.id,
      href: `#finding-${finding.id}`,
      source: "Profiling",
      field: subjectName(finding.subject, profiling.columns),
      signal: finding.title,
      state: label(finding.severity),
      stateClass: finding.severity.toLowerCase(),
    })),
  ];
  const visibleAttention = attentionItems.slice(0, ATTENTION_LIMIT);
  const remainingAttention = attentionItems.length - visibleAttention.length;
  const observedCompleteness =
    quality.observed_completeness == null
      ? "N/A"
      : scorePercent(quality.observed_completeness);
  const personalDataFields =
    governance.summary.columns_with_potential_personal_data.length;

  return (
    <section id="overview" className="overview" aria-labelledby="overview-title">
      <div className="section-heading overview-section-heading">
        <div>
          <p className="eyebrow">Analysis at a glance</p>
          <h2 id="overview-title">Overview</h2>
        </div>
        <p className="section-intro">
          A concise interpretation of the current deterministic assessment and
          the evidence-backed items that warrant review.
        </p>
      </div>

      <div
        className="overview-summary-grid"
        role="group"
        aria-label="Assessment summary"
      >
        <div>
          <p>Quality</p>
          <strong>{countLabel(quality.findings.length, "finding")}</strong>
          <span>Observed completeness: {observedCompleteness}</span>
          <a href="#quality">Inspect quality</a>
        </div>
        <div>
          <p>Governance</p>
          <strong>
            {countLabel(governance.classifications.length, "classification")}
          </strong>
          <span>
            {countLabel(personalDataFields, "field")} classified as potential
            personal data
          </span>
          <a href="#governance">Inspect governance</a>
        </div>
        <div>
          <p>Recommendations</p>
          <strong>
            {countLabel(
              recommendations.summary.total_count,
              "suggested action",
            )}
          </strong>
          <span>Deterministic actions linked to source findings.</span>
          <a href="#recommendations">Review actions</a>
        </div>
      </div>

      <section className="overview-attention" aria-labelledby="attention-title">
        <div className="overview-subheading">
          <div>
            <p className="eyebrow">Evidence-backed review</p>
            <h3 id="attention-title">Needs attention</h3>
          </div>
          {visibleAttention.length ? (
            <span>{countLabel(visibleAttention.length, "item")} shown</span>
          ) : null}
        </div>

        {qualityAttention.length === 0 ? (
          <p className="factual-empty-state">
            No Warning, High or Critical quality findings were produced by the
            current V0.1 rules.
          </p>
        ) : null}

        {visibleAttention.length ? (
          <>
            <div className="attention-columns" aria-hidden="true">
              <span>Type</span>
              <span>Field</span>
              <span>Signal / finding</span>
              <span>State</span>
            </div>
            <div className="attention-list" role="list">
              {visibleAttention.map((item) => (
                <div className="attention-row" role="listitem" key={item.id}>
                  <span className="attention-source">{item.source}</span>
                  <strong className="attention-field">{item.field}</strong>
                  <a className="attention-signal" href={item.href}>
                    {item.signal}
                  </a>
                  <span className={`attention-state ${item.stateClass}`}>
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {remainingAttention > 0 ? (
          <p className="attention-remainder">
            {countLabel(remainingAttention, "additional item")} remain available
            in the detailed Quality and Governance sections.
          </p>
        ) : null}
      </section>

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
