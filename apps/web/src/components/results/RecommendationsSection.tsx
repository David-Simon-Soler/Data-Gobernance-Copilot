"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import { countText, findingText, recommendationText } from "../../i18n/translations";
import type {
  AnalysisResponse,
  Evidence,
  Finding,
  Recommendation,
} from "../../types/api";
import { EvidenceContent } from "./EvidenceBox";

interface RecommendationGroup {
  key: string;
  action: string;
  rationale: string;
  category: string;
  priority: Recommendation["priority"];
  source: Recommendation["source"];
  recommendations: Recommendation[];
}

function groupRecommendations(items: Recommendation[]) {
  const groups = new Map<string, RecommendationGroup>();
  for (const recommendation of items) {
    const key = JSON.stringify([
      recommendation.priority,
      recommendation.category,
      recommendation.action,
      recommendation.rationale,
      recommendation.source,
    ]);
    const group = groups.get(key);
    if (group) {
      group.recommendations.push(recommendation);
    } else {
      groups.set(key, {
        key,
        action: recommendation.action,
        rationale: recommendation.rationale,
        category: recommendation.category,
        priority: recommendation.priority,
        source: recommendation.source,
        recommendations: [recommendation],
      });
    }
  }
  return [...groups.values()];
}

function findingSubject(
  finding: Finding | undefined,
  columnNames: ReadonlyMap<string, string>,
) {
  if (!finding) return null;
  return columnNames.get(finding.subject) ?? finding.subject;
}

function affectedFields(
  group: RecommendationGroup,
  findingsById: ReadonlyMap<string, Finding>,
  columnNames: ReadonlyMap<string, string>,
) {
  const fields: string[] = [];
  const seen = new Set<string>();
  for (const recommendation of group.recommendations) {
    const subject = findingSubject(
      findingsById.get(recommendation.finding_id),
      columnNames,
    );
    if (subject && !seen.has(subject)) {
      seen.add(subject);
      fields.push(subject);
    }
  }
  return fields;
}

function SourceRelationship({
  recommendation,
  finding,
  evidence,
  columnNames,
}: {
  recommendation: Recommendation;
  finding?: Finding;
  evidence: Evidence[];
  columnNames: ReadonlyMap<string, string>;
}) {
  const { locale, messages } = useLanguage();
  if (!finding) {
    return (
      <li className="recommendation-source-row">
        <div>
          <strong>{messages.sourceUnavailable}</strong>
          <span>{messages.findingUnavailable}</span>
        </div>
        <code>{recommendation.finding_id}</code>
      </li>
    );
  }
  const subject = findingSubject(finding, columnNames) ?? finding.subject;
  const translatedFinding = findingText(finding, locale, evidence, subject);

  const revealSourceFinding = () => {
    const source = document.getElementById(`finding-${finding.id}`);
    const disclosure = source?.closest<HTMLDetailsElement>(
      "details.findings-disclosure",
    );
    if (disclosure) disclosure.open = true;
  };

  return (
    <li className="recommendation-source-row">
      <div className="recommendation-source-identity">
        <strong>{subject}</strong>
        <span>{translatedFinding.title}</span>
      </div>
      <a href={`#finding-${finding.id}`} onClick={revealSourceFinding}>
        {messages.viewSourceFinding} {subject}
      </a>
      <details className="recommendation-source-evidence">
        <summary>{messages.reviewEvidenceFor} {subject}</summary>
        <div className="recommendation-source-evidence-content">
          <p>{translatedFinding.description}</p>
          <EvidenceContent ids={finding.evidence_ids} evidence={evidence} />
        </div>
      </details>
    </li>
  );
}

export function RecommendationsSection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { locale, messages, label, number } = useLanguage();
  const { profiling, quality, governance, recommendations } = analysis;
  const findings = [
    ...profiling.findings,
    ...quality.findings,
    ...governance.findings,
  ];
  const evidence = [
    ...profiling.evidence,
    ...quality.evidence,
    ...governance.evidence,
  ];
  const findingsById = new Map(findings.map((finding) => [finding.id, finding]));
  const columnNames = new Map(
    profiling.columns.map((column) => [column.column_id, column.name]),
  );
  const groups = groupRecommendations(recommendations.recommendations);

  return (
    <section id="recommendations" aria-labelledby="recommendations-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.suggestedActions}</p>
          <h2 id="recommendations-title">{messages.recommendations}</h2>
        </div>
        <p className="section-intro">
          {messages.recommendationsIntro}
        </p>
      </div>

      <div className="recommendation-summary" aria-label={messages.recommendationSummary}>
        <p>
          <strong>{number(recommendations.summary.total_count)}</strong>
          <span>
            {countText(recommendations.summary.total_count, messages.actionNoun, locale).replace(/^\S+\s+/, "")}
          </span>
        </p>
        {recommendations.summary.counts_by_priority.length ? (
          <dl aria-label={messages.canonicalPriorityCounts}>
            {recommendations.summary.counts_by_priority.map(([priority, count]) => (
              <div key={priority}>
                <dt>{label(priority)}</dt>
                <dd>{number(count)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {groups.length ? (
        <div className="recommendation-list">
          {groups.map((group) => {
            const fields = affectedFields(group, findingsById, columnNames);
            const firstRecommendation = group.recommendations[0];
            const sourceFinding = firstRecommendation
              ? findingsById.get(firstRecommendation.finding_id)
              : undefined;
            const translated = firstRecommendation
              ? recommendationText(firstRecommendation, locale, sourceFinding, evidence)
              : { action: group.action, rationale: group.rationale };
            return (
              <article
                className={`recommendation-group priority-${group.priority.toLowerCase()}`}
                key={group.key}
              >
                <header className="recommendation-action-heading">
                  <span className={`priority-label ${group.priority.toLowerCase()}`}>
                    {label(group.priority)}
                  </span>
                  <div>
                    <h3>{translated.action}</h3>
                    {fields.length ? (
                      <p className="recommendation-fields">
                        <span>{messages.fields}</span>
                        <span>{fields.join(" · ")}</span>
                      </p>
                    ) : null}
                  </div>
                </header>
                <p className="recommendation-rationale">{translated.rationale}</p>
                <p className="recommendation-source-summary">
                  {label(group.source)} · {countText(group.recommendations.length, messages.sourceFindingNoun, locale)}
                </p>
                <details className="recommendation-traceability">
                  <summary aria-label={messages.evidenceSourceFindings}>
                    {messages.evidenceSources}
                  </summary>
                  <div className="recommendation-traceability-content">
                    <div className="recommendation-traceability-heading">
                      <h4>{messages.sourceFindings}</h4>
                      <span>
                        {countText(group.recommendations.length, messages.canonicalRelationshipNoun, locale)}
                      </span>
                    </div>
                    <ul className="recommendation-sources">
                      {group.recommendations.map((recommendation) => (
                        <SourceRelationship
                          key={recommendation.id}
                          recommendation={recommendation}
                          finding={findingsById.get(recommendation.finding_id)}
                          evidence={evidence}
                          columnNames={columnNames}
                        />
                      ))}
                    </ul>
                    <details className="technical recommendation-technical">
                      <summary>{messages.technicalDetails}</summary>
                      <div className="technical-records">
                        {group.recommendations.map((recommendation) => (
                          <dl className="technical-grid" key={recommendation.id}>
                            <div><dt>{messages.recommendationId}</dt><dd><code>{recommendation.id}</code></dd></div>
                            <div><dt>{messages.findingId}</dt><dd><code>{recommendation.finding_id}</code></dd></div>
                            <div><dt>{messages.rule}</dt><dd><code>{recommendation.rule_id}</code></dd></div>
                            <div><dt>{messages.model}</dt><dd><code>{recommendation.model_version}</code></dd></div>
                            <div><dt>{messages.category}</dt><dd><code>{recommendation.category}</code></dd></div>
                          </dl>
                        ))}
                      </div>
                    </details>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty">
          {messages.noRecommendations}
        </p>
      )}
    </section>
  );
}
