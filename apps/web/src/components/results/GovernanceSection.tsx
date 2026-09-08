import { label } from "../../lib/format";
import type { AnalysisResponse, GovernanceClassification } from "../../types/api";
import { EvidenceBox } from "./EvidenceBox";
import { FindingsSection } from "./FindingCard";

const POTENTIAL_PERSONAL_DATA = "POTENTIAL_PERSONAL_DATA";

function groupByColumn(
  classifications: GovernanceClassification[],
  positions: ReadonlyMap<string, number>,
) {
  const groups = new Map<string, GovernanceClassification[]>();
  for (const classification of classifications) {
    const group = groups.get(classification.column_id) ?? [];
    group.push(classification);
    groups.set(classification.column_id, group);
  }
  return [...groups.entries()].sort(
    ([left], [right]) =>
      (positions.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function countCategories(classifications: GovernanceClassification[]) {
  const fieldsByCategory = new Map<string, Set<string>>();
  for (const classification of classifications) {
    const fields =
      fieldsByCategory.get(classification.category) ?? new Set<string>();
    fields.add(classification.column_id);
    fieldsByCategory.set(classification.category, fields);
  }
  return [...fieldsByCategory.entries()]
    .map(([category, fields]) => [category, fields.size] as const)
    .sort(([left], [right]) => label(left).localeCompare(label(right)));
}

const fieldCount = (count: number) =>
  `${count.toLocaleString()} field${count === 1 ? "" : "s"}`;

export function GovernanceSection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { profiling, governance } = analysis;
  const names = new Map(
    profiling.columns.map((column) => [column.column_id, column.name]),
  );
  const positions = new Map(
    profiling.columns.map((column) => [column.column_id, column.position]),
  );
  const groups = groupByColumn(governance.classifications, positions);
  const reviewGroups = groups.filter(([, classifications]) =>
    classifications.some(
      (classification) => classification.category === POTENTIAL_PERSONAL_DATA,
    ),
  );
  const categoryCounts = countCategories(governance.classifications);

  return (
    <section id="governance" aria-labelledby="governance-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Governance signals</p>
          <h2 id="governance-title">Governance</h2>
        </div>
        <p className="section-intro">
          Automated classifications identify fields for human review. They are
          not legal determinations and do not certify regulatory compliance.
        </p>
      </div>

      <dl className="governance-metrics" aria-label="Governance summary">
        <div>
          <dt>Classified fields</dt>
          <dd>{governance.summary.classified_column_count.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Potential personal-data fields</dt>
          <dd>
            {governance.summary.columns_with_potential_personal_data.length.toLocaleString()}
          </dd>
        </div>
      </dl>

      <section
        className="governance-review"
        aria-labelledby="governance-review-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">First-pass review</p>
            <h3 id="governance-review-title">Fields requiring review</h3>
          </div>
          <p>
            Fields classified as Potential Personal Data by the current V0.1
            rules. Classification does not confirm personal data.
          </p>
        </div>
        {reviewGroups.length ? (
          <div className="governance-review-table">
            <div className="governance-review-columns" aria-hidden="true">
              <span>Field</span>
              <span>Classifications</span>
              <span>Confidence</span>
              <span>Review</span>
            </div>
            <ul className="governance-review-list">
              {reviewGroups.map(([columnId, classifications]) => {
                const fieldName = names.get(columnId) ?? columnId;
                const reviewClassification = classifications.find(
                  (classification) =>
                    classification.category === POTENTIAL_PERSONAL_DATA,
                );
                return (
                  <li key={columnId}>
                    <strong className="governance-review-field">{fieldName}</strong>
                    <span
                      className="governance-review-categories"
                      aria-label={`Classifications for ${fieldName}`}
                    >
                      {classifications.map((classification) =>
                        label(classification.category),
                      ).join(" · ")}
                    </span>
                    <span className="governance-review-confidence">
                      {reviewClassification
                        ? `${label(reviewClassification.confidence)} confidence`
                        : "—"}
                    </span>
                    <a
                      href={`#governance-field-${columnId}`}
                      aria-label={`Review ${fieldName}`}
                    >
                      Review
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="empty">
            No fields were classified as Potential Personal Data by the current
            V0.1 governance rules.
          </p>
        )}
      </section>

      <section
        className="governance-overview"
        aria-labelledby="classification-overview-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">Canonical categories</p>
            <h3 id="classification-overview-title">Classification overview</h3>
          </div>
          <p>Counts reflect classifications present in this assessment.</p>
        </div>
        {categoryCounts.length ? (
          <dl className="governance-category-grid">
            {categoryCounts.map(([category, count]) => (
              <div key={category}>
                <dt>{label(category)}</dt>
                <dd>{fieldCount(count)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="empty">
            No governance classifications were produced by the current V0.1 rules.
          </p>
        )}
      </section>

      <section
        className="governance-classifications"
        aria-labelledby="all-classifications-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">Field-level evidence</p>
            <h3 id="all-classifications-title">All classifications</h3>
          </div>
          <p>
            {governance.classifications.length.toLocaleString()} classification
            {governance.classifications.length === 1 ? "" : "s"} across {fieldCount(groups.length)}
          </p>
        </div>
        {groups.length ? (
          <div className="governance-field-groups">
            {groups.map(([columnId, classifications]) => {
              const fieldName = names.get(columnId) ?? columnId;
              return (
                <article
                  className="governance-field-group"
                  id={`governance-field-${columnId}`}
                  key={columnId}
                >
                  <header>
                    <h4>{fieldName}</h4>
                    <span>
                      {classifications.length.toLocaleString()} classification
                      {classifications.length === 1 ? "" : "s"}
                    </span>
                  </header>
                  <ul aria-label={`Classifications for ${fieldName}`}>
                    {classifications.map((classification) => {
                      const classificationLabel = label(classification.category);
                      const isPotentialPersonalData =
                        classification.category === POTENTIAL_PERSONAL_DATA;
                      return (
                        <li
                          className={
                            isPotentialPersonalData
                              ? "governance-classification potential-personal-data"
                              : "governance-classification"
                          }
                          id={`classification-${classification.id}`}
                          key={classification.id}
                        >
                          <div className="governance-classification-meaning">
                            <strong>{classificationLabel}</strong>
                            <span>
                              {label(classification.assertion_level)} · {label(classification.confidence)} confidence
                            </span>
                          </div>
                          <details className="governance-classification-details">
                            <summary>Review classification details</summary>
                            <div className="governance-classification-detail-content">
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
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
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
