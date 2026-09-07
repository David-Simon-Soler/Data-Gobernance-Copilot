import { evidenceValue, label } from "../../lib/format";
import type { Evidence } from "../../types/api";

function matchingEvidence(ids: string[], evidence: Evidence[]) {
  const selected = new Set(ids);
  return evidence.filter((item) => selected.has(item.id));
}

export function EvidenceContent({
  ids,
  evidence,
}: {
  ids: string[];
  evidence: Evidence[];
}) {
  const items = matchingEvidence(ids, evidence);

  if (!items.length) {
    return <p className="muted">Evidence details are unavailable.</p>;
  }

  return (
    <div className="evidence-items">
      {items.map((item) => (
        <div className="evidence-item" key={item.id}>
          <div className="evidence-measure">
            <strong>{label(item.metric)}</strong>
            <span>{evidenceValue(item.metric, item.observed_value)}</span>
          </div>
          {item.affected_rows != null || item.denominator != null ? (
            <p className="muted">
              {item.affected_rows != null
                ? `${item.affected_rows.toLocaleString()} affected rows`
                : null}
              {item.affected_rows != null && item.denominator != null
                ? " · "
                : null}
              {item.denominator != null
                ? `${item.denominator.toLocaleString()} assessed`
                : null}
            </p>
          ) : null}
          <dl className="technical-grid">
            <div>
              <dt>Evidence ID</dt>
              <dd><code>{item.id}</code></dd>
            </div>
            <div>
              <dt>Rule</dt>
              <dd><code>{item.rule_id}</code></dd>
            </div>
            <div>
              <dt>Rule version</dt>
              <dd><code>{item.rule_version}</code></dd>
            </div>
            {item.sample_policy ? (
              <div>
                <dt>Sample policy</dt>
                <dd>{item.sample_policy}</dd>
              </div>
            ) : null}
          </dl>
          {item.details?.length ? (
            <dl className="technical-grid evidence-details">
              {item.details.map(([key, value]) => (
                <div key={key}>
                  <dt>{label(key)}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function EvidenceBox({
  ids,
  evidence,
  summary = "Why this was flagged",
}: {
  ids: string[];
  evidence: Evidence[];
  summary?: string;
}) {
  return (
    <details className="evidence">
      <summary>{summary}</summary>
      <div className="detail">
        <EvidenceContent ids={ids} evidence={evidence} />
      </div>
    </details>
  );
}
