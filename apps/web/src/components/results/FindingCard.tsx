import { label } from "../../lib/format";
import type { ColumnProfile, Evidence, Finding } from "../../types/api";
import { EvidenceBox } from "./EvidenceBox";

export function FindingCard({
  finding,
  evidence,
  columns,
  source,
  modelVersion,
  compact = false,
}: {
  finding: Finding;
  evidence: Evidence[];
  columns: ColumnProfile[];
  source: "Profiling" | "Quality" | "Governance";
  modelVersion: string;
  compact?: boolean;
}) {
  const subject =
    columns.find((column) => column.column_id === finding.subject)?.name ??
    finding.subject;
  const detail = (
    <>
      <p>{finding.description}</p>
      {!compact ? (
        <>
          <p className="finding-subject">
            Affected field: <strong>{subject}</strong>
          </p>
          <p className="finding-meta">
            {label(finding.assertion_level)} · {label(finding.confidence)} confidence
          </p>
        </>
      ) : null}
      <EvidenceBox ids={finding.evidence_ids} evidence={evidence} />
      <details className="technical">
        <summary>Technical details</summary>
        <dl className="technical-grid">
          <div><dt>Source</dt><dd>{source}</dd></div>
          <div><dt>Model</dt><dd><code>{modelVersion}</code></dd></div>
          <div><dt>Finding ID</dt><dd><code>{finding.id}</code></dd></div>
          <div><dt>Method</dt><dd>{finding.method}</dd></div>
          <div><dt>Category</dt><dd><code>{finding.category}</code></dd></div>
        </dl>
      </details>
    </>
  );

  return (
    <article
      className={`finding severity-${finding.severity.toLowerCase()}${compact ? " compact-finding" : ""}`}
      id={`finding-${finding.id}`}
    >
      <div className="finding-heading">
        <div>
          <p className="eyebrow">{label(finding.category)}</p>
          <h4>{finding.title}</h4>
        </div>
        <span className={`severity-label ${finding.severity.toLowerCase()}`}>
          Severity: {label(finding.severity)}
        </span>
      </div>
      {compact ? (
        <>
          <p className="finding-compact-meta">
            <span>Affected field: <strong>{subject}</strong></span>
            <span>
              {label(finding.assertion_level)} · {label(finding.confidence)} confidence
            </span>
          </p>
          <details className="finding-review">
            <summary>Review finding details</summary>
            <div className="finding-review-content">{detail}</div>
          </details>
        </>
      ) : detail}
    </article>
  );
}

export function FindingsSection({
  title,
  findings,
  evidence,
  columns,
  source,
  modelVersion,
  subdued = false,
  collapsed = false,
  compact = false,
  description,
  emptyMessage = "No findings were produced by the current V0.1 rules.",
}: {
  title: string;
  findings: Finding[];
  evidence: Evidence[];
  columns: ColumnProfile[];
  source: "Profiling" | "Quality" | "Governance";
  modelVersion: string;
  subdued?: boolean;
  collapsed?: boolean;
  compact?: boolean;
  description?: string;
  emptyMessage?: string;
}) {
  const list = (
    <div className="finding-list">
      {findings.map((finding) => (
        <FindingCard
          key={finding.id}
          finding={finding}
          evidence={evidence}
          columns={columns}
          source={source}
          modelVersion={modelVersion}
          compact={compact}
        />
      ))}
    </div>
  );

  return (
    <section
      className={`findings-section${subdued ? " subdued" : ""}${compact ? " compact-findings" : ""}`}
    >
      <div className="findings-section-heading">
        {description ? (
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ) : (
          <h3>{title}</h3>
        )}
        {collapsed || compact ? (
          <span>
            {findings.length.toLocaleString()} {collapsed ? "traceability " : ""}finding
            {findings.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {findings.length ? (
        collapsed ? (
          <details className="findings-disclosure">
            <summary>Review all findings</summary>
            {list}
          </details>
        ) : list
      ) : (
        <p className="empty">{emptyMessage}</p>
      )}
    </section>
  );
}
