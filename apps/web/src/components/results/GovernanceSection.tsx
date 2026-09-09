"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import { countText } from "../../i18n/translations";
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

function countCategories(
  classifications: GovernanceClassification[],
  labeler: (value: string) => string,
) {
  const fieldsByCategory = new Map<string, Set<string>>();
  for (const classification of classifications) {
    const fields =
      fieldsByCategory.get(classification.category) ?? new Set<string>();
    fields.add(classification.column_id);
    fieldsByCategory.set(classification.category, fields);
  }
  return [...fieldsByCategory.entries()]
    .map(([category, fields]) => [category, fields.size] as const)
    .sort(([left], [right]) => labeler(left).localeCompare(labeler(right)));
}

export function GovernanceSection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { locale, messages, label, number } = useLanguage();
  const fieldCount = (count: number) => countText(count, messages.fieldNoun, locale);
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
  const categoryCounts = countCategories(governance.classifications, label);

  return (
    <section id="governance" aria-labelledby="governance-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.governanceSignals}</p>
          <h2 id="governance-title">{messages.governance}</h2>
        </div>
        <p className="section-intro">
          {messages.governanceIntro}
        </p>
      </div>

      <dl className="governance-metrics" aria-label={messages.governanceSummary}>
        <div>
          <dt>{messages.classifiedFields}</dt>
          <dd>{number(governance.summary.classified_column_count)}</dd>
        </div>
        <div>
          <dt>{messages.potentialPersonalFields}</dt>
          <dd>
            {number(governance.summary.columns_with_potential_personal_data.length)}
          </dd>
        </div>
      </dl>

      <section
        className="governance-review"
        aria-labelledby="governance-review-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">{messages.firstPassReview}</p>
            <h3 id="governance-review-title">{messages.fieldsRequiringReview}</h3>
          </div>
          <p>
            {messages.reviewFieldsIntro}
          </p>
        </div>
        {reviewGroups.length ? (
          <div className="governance-review-table">
            <div className="governance-review-columns" aria-hidden="true">
              <span>{messages.field}</span>
              <span>{messages.classifications}</span>
              <span>{messages.confidence}</span>
              <span>{messages.review}</span>
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
                      aria-label={`${messages.classificationsFor} ${fieldName}`}
                    >
                      {classifications.map((classification) =>
                        label(classification.category),
                      ).join(" · ")}
                    </span>
                    <span className="governance-review-confidence">
                      {reviewClassification
                        ? `${label(reviewClassification.confidence)} ${messages.confidenceLower}`
                        : "—"}
                    </span>
                    <a
                      href={`#governance-field-${columnId}`}
                      aria-label={`${messages.reviewField} ${fieldName}`}
                    >
                      {messages.review}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="empty">
            {messages.noPersonalFields}
          </p>
        )}
      </section>

      <section
        className="governance-overview"
        aria-labelledby="classification-overview-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">{messages.canonicalCategories}</p>
            <h3 id="classification-overview-title">{messages.classificationOverview}</h3>
          </div>
          <p>{messages.classificationCounts}</p>
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
            {messages.noGovernanceClassifications}
          </p>
        )}
      </section>

      <section
        className="governance-classifications"
        aria-labelledby="all-classifications-title"
      >
        <div className="governance-subheading">
          <div>
            <p className="eyebrow">{messages.fieldLevelEvidence}</p>
            <h3 id="all-classifications-title">{messages.allClassifications}</h3>
          </div>
          <p>
            {countText(governance.classifications.length, messages.classificationNoun, locale)} {messages.across} {fieldCount(groups.length)}
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
                      {countText(classifications.length, messages.classificationNoun, locale)}
                    </span>
                  </header>
                  <ul aria-label={`${messages.classificationsFor} ${fieldName}`}>
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
                              {label(classification.assertion_level)} · {label(classification.confidence)} {messages.confidenceLower}
                            </span>
                          </div>
                          <details className="governance-classification-details">
                            <summary>{messages.reviewClassification}</summary>
                            <div className="governance-classification-detail-content">
                              <EvidenceBox
                                ids={classification.evidence_ids}
                                evidence={governance.evidence}
                                summary={messages.classificationEvidence}
                              />
                              <details className="technical">
                                <summary>{messages.technicalDetails}</summary>
                                <dl className="technical-grid">
                                  <div><dt>{messages.classificationId}</dt><dd><code>{classification.id}</code></dd></div>
                                  <div><dt>{messages.method}</dt><dd>{classification.method}</dd></div>
                                  <div><dt>{messages.ruleVersion}</dt><dd><code>{classification.rule_version}</code></dd></div>
                                  <div><dt>{messages.deterministic}</dt><dd>{classification.deterministic ? messages.yes : messages.no}</dd></div>
                                  <div><dt>{messages.columnId}</dt><dd><code>{classification.column_id}</code></dd></div>
                                </dl>
                                {classification.signals.length ? (
                                  <ul className="signal-list">
                                    {classification.signals.map((signal) => (
                                      <li key={signal.id}>
                                        {label(signal.signal_type)} · {messages.strength} {signal.strength} · {messages.rule.toLowerCase()} {signal.rule_id}
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
            {messages.noGovernanceClassifications}
          </p>
        )}
      </section>

      <FindingsSection
        title={messages.governanceFindingsEvidence}
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
