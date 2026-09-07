import { label } from "../../lib/format";
import type { AnalysisResponse, Evidence, Finding, Recommendation } from "../../types/api";
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
      <div className="recommendation-source">
        <p className="muted">Source finding details unavailable.</p>
        <code>{recommendation.finding_id}</code>
      </div>
    );
  }
  const subject = columnNames.get(finding.subject) ?? finding.subject;

  const revealSourceFinding = () => {
    const source = document.getElementById(`finding-${finding.id}`);
    const disclosure = source?.closest<HTMLDetailsElement>(
      "details.findings-disclosure",
    );
    if (disclosure) disclosure.open = true;
  };

  return (
    <div className="recommendation-source">
      <a href={`#finding-${finding.id}`} onClick={revealSourceFinding}>
        View source finding for {subject}
      </a>
      <details className="evidence recommendation-evidence">
        <summary>Why this recommendation?</summary>
        <div className="detail">
          <strong>{finding.title}</strong>
          <p>{finding.description}</p>
          <EvidenceContent ids={finding.evidence_ids} evidence={evidence} />
        </div>
      </details>
    </div>
  );
}

export function RecommendationsSection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { profiling, quality, governance, recommendations } = analysis;
  const findings = [...profiling.findings, ...quality.findings, ...governance.findings];
  const evidence = [...profiling.evidence, ...quality.evidence, ...governance.evidence];
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
          {recommendations.summary.total_count.toLocaleString()} canonical
          recommendation{recommendations.summary.total_count === 1 ? "" : "s"},
          each linked to the finding and evidence that produced it.
        </p>
      </div>

      {groups.length ? (
        <div className="recommendation-list">
          {groups.map((group) => (
            <article className="recommendation-group" key={group.key}>
              <div className="recommendation-heading">
                <div>
                  <p className="recommendation-source-label">
                    {label(group.source)} · {label(group.category)}
                  </p>
                  <h3>{group.action}</h3>
                </div>
                <span className={`priority-label ${group.priority.toLowerCase()}`}>
                  Priority {group.priority}
                </span>
              </div>
              <p>{group.rationale}</p>
              <p className="canonical-count">
                {group.recommendations.length.toLocaleString()} canonical source
                relationship{group.recommendations.length === 1 ? "" : "s"}
              </p>
              <div className="recommendation-sources">
                {group.recommendations.map((recommendation) => (
                  <SourceRelationship
                    key={recommendation.id}
                    recommendation={recommendation}
                    finding={findingsById.get(recommendation.finding_id)}
                    evidence={evidence}
                    columnNames={columnNames}
                  />
                ))}
              </div>
              <details className="technical">
                <summary>Technical details</summary>
                <div className="technical-records">
                  {group.recommendations.map((recommendation) => (
                    <dl className="technical-grid" key={recommendation.id}>
                      <div><dt>Recommendation ID</dt><dd><code>{recommendation.id}</code></dd></div>
                      <div><dt>Finding ID</dt><dd><code>{recommendation.finding_id}</code></dd></div>
                      <div><dt>Rule</dt><dd><code>{recommendation.rule_id}</code></dd></div>
                      <div><dt>Model</dt><dd><code>{recommendation.model_version}</code></dd></div>
                    </dl>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">
          No recommendations were produced by the current V0.1 rules.
        </p>
      )}
    </section>
  );
}
