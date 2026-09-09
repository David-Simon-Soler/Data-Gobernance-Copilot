"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import { countText, findingText } from "../../i18n/translations";
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
  const { locale, messages, label } = useLanguage();
  const subject =
    columns.find((column) => column.column_id === finding.subject)?.name ??
    finding.subject;
  const translated = findingText(finding, locale, evidence, subject);
  const detail = (
    <>
      <p>{translated.description}</p>
      {!compact ? (
        <>
          <p className="finding-subject">
            {messages.affectedField}: <strong>{subject}</strong>
          </p>
          <p className="finding-meta">
            {label(finding.assertion_level)} · {label(finding.confidence)} {messages.confidenceLower}
          </p>
        </>
      ) : null}
      <EvidenceBox ids={finding.evidence_ids} evidence={evidence} />
      <details className="technical">
        <summary>{messages.technicalDetails}</summary>
        <dl className="technical-grid">
          <div><dt>{messages.source}</dt><dd>{label(source)}</dd></div>
          <div><dt>{messages.model}</dt><dd><code>{modelVersion}</code></dd></div>
          <div><dt>{messages.findingId}</dt><dd><code>{finding.id}</code></dd></div>
          <div><dt>{messages.method}</dt><dd>{finding.method}</dd></div>
          <div><dt>{messages.category}</dt><dd><code>{finding.category}</code></dd></div>
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
          <h4>{translated.title}</h4>
        </div>
        <span className={`severity-label ${finding.severity.toLowerCase()}`}>
          {messages.severity}: {label(finding.severity)}
        </span>
      </div>
      {compact ? (
        <>
          <p className="finding-compact-meta">
            <span>{messages.affectedField}: <strong>{subject}</strong></span>
            <span>
              {label(finding.assertion_level)} · {label(finding.confidence)} {messages.confidenceLower}
            </span>
          </p>
          <details className="finding-review">
            <summary>{messages.reviewFindingDetails}</summary>
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
  emptyMessage,
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
  const { locale, messages, number } = useLanguage();
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
            {number(findings.length)} {collapsed ? `${messages.traceability} ` : ""}
            {countText(findings.length, messages.findingNoun, locale).replace(/^\S+\s+/, "")}
          </span>
        ) : null}
      </div>
      {findings.length ? (
        collapsed ? (
          <details className="findings-disclosure">
            <summary>{messages.reviewAllFindings}</summary>
            {list}
          </details>
        ) : list
      ) : (
        <p className="empty">{emptyMessage ?? messages.noFindings}</p>
      )}
    </section>
  );
}
