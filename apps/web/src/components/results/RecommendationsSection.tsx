"use client";

import { label } from "../../lib/format";
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
  if (!finding) {
    return (
      <li className="recommendation-source-row">
        <div>
          <strong>Source unavailable</strong>
          <span>Finding details are unavailable.</span>
        </div>
        <code>{recommendation.finding_id}</code>
      </li>
    );
  }
  const subject = findingSubject(finding, columnNames) ?? finding.subject;

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
        <span>{finding.title}</span>
      </div>
      <a href={`#finding-${finding.id}`} onClick={revealSourceFinding}>
        View source finding for {subject}
      </a>
      <details className="recommendation-source-evidence">
        <summary>Review evidence for {subject}</summary>
        <div className="recommendation-source-evidence-content">
          <p>{finding.description}</p>
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
          <p className="eyebrow">Suggested next actions</p>
          <h2 id="recommendations-title">Recommendations</h2>
        </div>
        <p className="section-intro">
          Deterministic suggestions linked to the source findings and evidence
          that produced them. Priority communicates action order, not severity
          or risk.
        </p>
      </div>

      <div className="recommendation-summary" aria-label="Recommendation summary">
        <p>
          <strong>{recommendations.summary.total_count.toLocaleString()}</strong>
          <span>
            suggested action
            {recommendations.summary.total_count === 1 ? "" : "s"}
          </span>
        </p>
        {recommendations.summary.counts_by_priority.length ? (
          <dl aria-label="Canonical recommendation counts by priority">
            {recommendations.summary.counts_by_priority.map(([priority, count]) => (
              <div key={priority}>
                <dt>{priority}</dt>
                <dd>{count.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {groups.length ? (
        <div className="recommendation-list">
          {groups.map((group) => {
            const fields = affectedFields(group, findingsById, columnNames);
            return (
              <article
                className={`recommendation-group priority-${group.priority.toLowerCase()}`}
                key={group.key}
              >
                <header className="recommendation-action-heading">
                  <span className={`priority-label ${group.priority.toLowerCase()}`}>
                    {group.priority}
                  </span>
                  <div>
                    <h3>{group.action}</h3>
                    {fields.length ? (
                      <p className="recommendation-fields">
                        <span>Fields</span>
                        <span>{fields.join(" · ")}</span>
                      </p>
                    ) : null}
                  </div>
                </header>
                <p className="recommendation-rationale">{group.rationale}</p>
                <p className="recommendation-source-summary">
                  {label(group.source)} · {group.recommendations.length.toLocaleString()} source
                  {" "}finding{group.recommendations.length === 1 ? "" : "s"}
                </p>
                <details className="recommendation-traceability">
                  <summary aria-label="Evidence and source findings">
                    Evidence &amp; sources
                  </summary>
                  <div className="recommendation-traceability-content">
                    <div className="recommendation-traceability-heading">
                      <h4>Source findings</h4>
                      <span>
                        {group.recommendations.length.toLocaleString()} canonical source
                        {" "}relationship{group.recommendations.length === 1 ? "" : "s"}
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
                      <summary>Technical details</summary>
                      <div className="technical-records">
                        {group.recommendations.map((recommendation) => (
                          <dl className="technical-grid" key={recommendation.id}>
                            <div><dt>Recommendation ID</dt><dd><code>{recommendation.id}</code></dd></div>
                            <div><dt>Finding ID</dt><dd><code>{recommendation.finding_id}</code></dd></div>
                            <div><dt>Rule</dt><dd><code>{recommendation.rule_id}</code></dd></div>
                            <div><dt>Model</dt><dd><code>{recommendation.model_version}</code></dd></div>
                            <div><dt>Category</dt><dd><code>{recommendation.category}</code></dd></div>
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
          No recommendations were produced by the current V0.1 rules.
        </p>
      )}
    </section>
  );
}
