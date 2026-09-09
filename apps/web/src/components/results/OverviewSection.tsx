"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import { countText, findingText, warningText } from "../../i18n/translations";
import { scorePercent } from "../../lib/format";
import type { AnalysisResponse, Severity } from "../../types/api";

const ATTENTION_SEVERITIES: Exclude<Severity, "INFO">[] = [
  "CRITICAL",
  "HIGH",
  "WARNING",
];
const ATTENTION_LIMIT = 6;

const subjectName = (
  subject: string,
  columns: AnalysisResponse["analysis"]["profiling"]["columns"],
) => columns.find((column) => column.column_id === subject)?.name ?? subject;

export function OverviewSection({
  response,
}: {
  response: AnalysisResponse;
}) {
  const { locale, messages, label } = useLanguage();
  const countLabel = (count: number, singular: string) => countText(count, singular, locale);
  const { metadata, analysis, schema_version: schemaVersion } = response;
  const { profiling, quality, governance, recommendations } = analysis;
  const qualityAttention = quality.findings.filter((finding) =>
    ATTENTION_SEVERITIES.includes(finding.severity as Exclude<Severity, "INFO">),
  );
  const profilingAttention = profiling.findings.filter((finding) =>
    ATTENTION_SEVERITIES.includes(finding.severity as Exclude<Severity, "INFO">),
  );
  const attentionItems = [
    ...qualityAttention.map((finding) => ({
      id: finding.id,
      href: `#finding-${finding.id}`,
      source: messages.quality,
      field: subjectName(finding.subject, profiling.columns),
      signal: findingText(
        finding,
        locale,
        quality.evidence,
        subjectName(finding.subject, profiling.columns),
      ).title,
      state: label(finding.severity),
      stateClass: finding.severity.toLowerCase(),
    })),
    ...governance.findings.map((finding) => ({
      id: finding.id,
      href: "#governance",
      source: messages.governance,
      field: subjectName(finding.subject, profiling.columns),
      signal: findingText(
        finding,
        locale,
        governance.evidence,
        subjectName(finding.subject, profiling.columns),
      ).title,
      state: `${messages.review} · ${label(finding.confidence)} ${messages.confidence.toLowerCase()}`,
      stateClass: "review",
    })),
    ...profilingAttention.map((finding) => ({
      id: finding.id,
      href: `#finding-${finding.id}`,
      source: messages.profiling,
      field: subjectName(finding.subject, profiling.columns),
      signal: findingText(
        finding,
        locale,
        profiling.evidence,
        subjectName(finding.subject, profiling.columns),
      ).title,
      state: label(finding.severity),
      stateClass: finding.severity.toLowerCase(),
    })),
  ];
  const visibleAttention = attentionItems.slice(0, ATTENTION_LIMIT);
  const remainingAttention = attentionItems.length - visibleAttention.length;
  const observedCompleteness =
    quality.observed_completeness == null
      ? "N/A"
      : scorePercent(quality.observed_completeness);
  const personalDataFields =
    governance.summary.columns_with_potential_personal_data.length;

  return (
    <section id="overview" className="overview" aria-labelledby="overview-title">
      <div className="section-heading overview-section-heading">
        <div>
          <p className="eyebrow">{messages.analysisGlance}</p>
          <h2 id="overview-title">{messages.overview}</h2>
        </div>
        <p className="section-intro">
          {messages.overviewIntro}
        </p>
      </div>

      <div
        className="overview-summary-grid"
        role="group"
        aria-label={messages.assessmentSummary}
      >
        <div>
          <p>{messages.quality}</p>
          <strong>{countLabel(quality.findings.length, messages.findingNoun)}</strong>
          <span>{messages.observedCompletenessPrefix} {observedCompleteness}</span>
          <a href="#quality">{messages.inspectQuality}</a>
        </div>
        <div>
          <p>{messages.governance}</p>
          <strong>
            {countLabel(governance.classifications.length, messages.classificationNoun)}
          </strong>
          <span>
            {countLabel(personalDataFields, messages.fieldNoun)} {messages.potentialPersonalSummary}
          </span>
          <a href="#governance">{messages.inspectGovernance}</a>
        </div>
        <div>
          <p>{messages.recommendations}</p>
          <strong>
            {countLabel(
              recommendations.summary.total_count,
              messages.actionNoun,
            )}
          </strong>
          <span>{messages.deterministicActions}</span>
          <a href="#recommendations">{messages.reviewActions}</a>
        </div>
      </div>

      <section className="overview-attention" aria-labelledby="attention-title">
        <div className="overview-subheading">
          <div>
            <p className="eyebrow">{messages.evidenceReview}</p>
            <h3 id="attention-title">{messages.needsAttention}</h3>
          </div>
          {visibleAttention.length ? (
            <span>{countLabel(visibleAttention.length, messages.itemNoun)} {messages.shown}</span>
          ) : null}
        </div>

        {qualityAttention.length === 0 ? (
          <p className="factual-empty-state">
            {messages.noAttentionFindings}
          </p>
        ) : null}

        {visibleAttention.length ? (
          <>
            <div className="attention-columns" aria-hidden="true">
              <span>{messages.type}</span>
              <span>{messages.field}</span>
              <span>{messages.signalFinding}</span>
              <span>{messages.state}</span>
            </div>
            <div className="attention-list" role="list">
              {visibleAttention.map((item) => (
                <div className="attention-row" role="listitem" key={item.id}>
                  <span className="attention-source">{item.source}</span>
                  <strong className="attention-field">{item.field}</strong>
                  <a className="attention-signal" href={item.href}>
                    {item.signal}
                  </a>
                  <span className={`attention-state ${item.stateClass}`}>
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {remainingAttention > 0 ? (
          <p className="attention-remainder">
            {countLabel(remainingAttention, messages.additionalItemNoun)} {messages.remainingAttention}
          </p>
        ) : null}
      </section>

      {metadata.warnings.length ? (
        <div className="warning overview-warning" role="status">
          <strong>{messages.ingestionWarnings}</strong>
          {metadata.warnings.map((warning, index) => (
            <p key={`${index}-${warning}`}>{warningText(warning, locale)}</p>
          ))}
        </div>
      ) : null}

      <details className="analysis-details">
        <summary>{messages.analysisDetails}</summary>
        <dl>
          <div>
            <dt>{messages.responseSchema}</dt>
            <dd><code>{schemaVersion}</code></dd>
          </div>
          <div>
            <dt>{messages.profilingModel}</dt>
            <dd><code>{profiling.model_version}</code></dd>
          </div>
          {profiling.profiling_metadata?.profiling_method ? (
            <div>
              <dt>{messages.profilingMethod}</dt>
              <dd><code>{profiling.profiling_metadata.profiling_method}</code></dd>
            </div>
          ) : null}
          <div>
            <dt>{messages.qualityModel}</dt>
            <dd><code>{quality.model_version}</code></dd>
          </div>
          <div>
            <dt>{messages.governanceModel}</dt>
            <dd><code>{governance.model_version}</code></dd>
          </div>
          <div>
            <dt>{messages.recommendationModel}</dt>
            <dd><code>{recommendations.model_version}</code></dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
