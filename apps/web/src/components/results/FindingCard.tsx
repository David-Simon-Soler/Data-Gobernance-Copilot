import { label } from "../../lib/format";
import type { ColumnProfile, Evidence, Finding } from "../../types/api";
import { EvidenceBox } from "./EvidenceBox";

export function FindingCard({
  finding,
  evidence,
  columns,
  source,
  modelVersion,
}: {
  finding: Finding;
  evidence: Evidence[];
  columns: ColumnProfile[];
  source: "Profiling" | "Quality" | "Governance";
  modelVersion: string;
}) {
  const subject =
    columns.find((column) => column.column_id === finding.subject)?.name ??
    finding.subject;

  return (
    <article
      className={`finding severity-${finding.severity.toLowerCase()}`}
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
      <p>{finding.description}</p>
      <p className="finding-subject">
        Affected field: <strong>{subject}</strong>
      </p>
      <p className="finding-meta">
        {label(finding.assertion_level)} · {label(finding.confidence)} confidence
      </p>
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
}: {
  title: string;
  findings: Finding[];
  evidence: Evidence[];
  columns: ColumnProfile[];
  source: "Profiling" | "Quality" | "Governance";
  modelVersion: string;
  subdued?: boolean;
  collapsed?: boolean;
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
        />
      ))}
    </div>
  );

  return (
    <section className={`findings-section${subdued ? " subdued" : ""}`}>
      <div className="findings-section-heading">
        <h3>{title}</h3>
        {collapsed ? (
          <span>
            {findings.length.toLocaleString()} traceability finding
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
        <p className="empty">
          No findings were produced by the current V0.1 rules.
        </p>
      )}
    </section>
  );
}
