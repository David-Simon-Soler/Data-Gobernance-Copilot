import { label } from "../../lib/format";
import type { AnalysisResponse, GovernanceClassification } from "../../types/api";
import { EvidenceBox } from "./EvidenceBox";
import { FindingsSection } from "./FindingCard";

function groupByColumn(classifications: GovernanceClassification[]) {
  const groups = new Map<string, GovernanceClassification[]>();
  for (const classification of classifications) {
    const group = groups.get(classification.column_id) ?? [];
    group.push(classification);
    groups.set(classification.column_id, group);
  }
  return [...groups.entries()];
}

export function GovernanceSection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { profiling, governance } = analysis;
  const names = new Map(
    profiling.columns.map((column) => [column.column_id, column.name]),
  );
  const groups = groupByColumn(governance.classifications);

  return (
    <section id="governance" aria-labelledby="governance-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Governance signals</p>
          <h2 id="governance-title">Governance</h2>
        </div>
        <p className="section-intro">
          Deterministic classifications identify fields for human review. They
          are not legal determinations and do not certify regulatory compliance.
        </p>
      </div>

      <div className="governance-summary" role="group" aria-label="Governance summary">
        <dl className="governance-primary-summary">
          <div>
            <dt>Classified fields</dt>
            <dd>{governance.summary.classified_column_count.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Potential personal data</dt>
            <dd>
              {governance.summary.columns_with_potential_personal_data.length.toLocaleString()}
            </dd>
          </div>
        </dl>
        <details className="category-breakdown">
          <summary>Complete category counts</summary>
          <dl>
            {governance.summary.category_counts.map(([category, count]) => (
              <div key={category}>
                <dt>{label(category)}</dt>
                <dd>{count.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>

      <section className="classification-section">
        <h3>Classified fields</h3>
        {groups.length ? (
          <div className="classification-groups">
            {groups.map(([columnId, classifications]) => (
              <article className="classification-group" key={columnId}>
                <h4>{names.get(columnId) ?? columnId}</h4>
                <div className="classification-list">
                  {classifications.map((classification) => (
                    <div className="classification-row" key={classification.id}>
                      <div className="classification-meaning">
                        <strong>{label(classification.category)}</strong>
                        <span>{label(classification.assertion_level)}</span>
                        <span>{label(classification.confidence)} confidence</span>
                      </div>
                      <EvidenceBox
                        ids={classification.evidence_ids}
                        evidence={governance.evidence}
                        summary="Classification evidence"
                      />
                      <details className="technical">
                        <summary>Technical details</summary>
                        <dl className="technical-grid">
                          <div><dt>Classification ID</dt><dd><code>{classification.id}</code></dd></div>
                          <div><dt>Method</dt><dd>{classification.method}</dd></div>
                          <div><dt>Rule version</dt><dd><code>{classification.rule_version}</code></dd></div>
                          <div><dt>Deterministic</dt><dd>{classification.deterministic ? "Yes" : "No"}</dd></div>
                          <div><dt>Column ID</dt><dd><code>{classification.column_id}</code></dd></div>
                        </dl>
                        {classification.signals.length ? (
                          <ul className="signal-list">
                            {classification.signals.map((signal) => (
                              <li key={signal.id}>
                                {label(signal.signal_type)} · strength {signal.strength} · rule {signal.rule_id}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </details>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty">
            No governance classifications were produced by the current V0.1 rules.
          </p>
        )}
      </section>

      <FindingsSection
        title="Governance findings & evidence"
        findings={governance.findings}
        evidence={governance.evidence}
        columns={profiling.columns}
        source="Governance"
        modelVersion={governance.model_version}
        subdued
        collapsed
      />
    </section>
  );
}
