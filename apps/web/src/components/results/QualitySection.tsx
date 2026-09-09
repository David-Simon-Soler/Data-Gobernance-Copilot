"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import { qualityReasonText } from "../../i18n/translations";
import type { AnalysisResponse } from "../../types/api";
import { FindingsSection } from "./FindingCard";

const scoreLabel = (score: number | null) =>
  score == null ? "N/A" : `${score.toFixed(1).replace(/\.0$/, "")} / 100`;

export function QualitySection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { locale, messages, label } = useLanguage();
  const { profiling, quality } = analysis;
  const weights = new Map(quality.applied_weights ?? []);

  return (
    <section id="quality" className="quality-section" aria-labelledby="quality-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{messages.deterministicAssessment}</p>
          <h2 id="quality-title">{messages.quality}</h2>
        </div>
        <p className="section-intro">
          {messages.qualityIntro}
        </p>
      </div>

      <div className="quality-assessment" aria-label={messages.structuralAssessment}>
        <div className="quality-score quality-assessment-score">
          <span>{messages.overallStructuralQuality}</span>
          <div>
            <strong>{quality.overall_score ?? "N/A"}</strong>
            <span>
              {quality.overall_score == null ? label("NOT_APPLICABLE") : "/ 100"}
            </span>
          </div>
        </div>
        <p>
          {messages.qualityScoreExplanation}
        </p>
      </div>

      <div className="quality-dimensions-heading">
        <h3>{messages.dimensions}</h3>
        <p>{messages.dimensionIntro}</p>
      </div>

      <div
        className="quality-dimension-list"
        role="group"
        aria-label={messages.qualityDimensions}
      >
        {quality.dimensions.map((dimension) => {
          const reason = qualityReasonText(dimension.reason, locale);
          const weight = weights.get(dimension.name);
          const applicable =
            dimension.applicability === "APPLICABLE" && dimension.score != null;
          return (
            <article className="quality-dimension" key={dimension.name}>
              <div className="quality-dimension-header">
                <div>
                  <h4>{label(dimension.name)}</h4>
                  <span className="applicability">
                    {label(dimension.applicability)}
                  </span>
                </div>
                <strong className="dimension-score">
                  {scoreLabel(dimension.score)}
                </strong>
              </div>

              {applicable ? (
                <div
                  className="quality-meter"
                  role="progressbar"
                  aria-label={`${label(dimension.name)} ${messages.score}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dimension.score ?? undefined}
                  aria-valuetext={`${scoreLabel(dimension.score)}, ${label(
                    dimension.applicability,
                  )}`}
                >
                  <span style={{ width: `${Math.min(100, Math.max(0, dimension.score ?? 0))}%` }} />
                </div>
              ) : (
                <div className="quality-meter not-applicable" aria-hidden="true" />
              )}

              {reason ? <p className="dimension-reason">{reason}</p> : null}
              <details className="technical dimension-technical">
                <summary>{messages.technicalDetails}</summary>
                <dl className="technical-grid">
                  <div><dt>{messages.applicability}</dt><dd><code>{dimension.applicability}</code></dd></div>
                  <div><dt>{messages.numerator}</dt><dd>{dimension.numerator ?? "—"}</dd></div>
                  <div><dt>{messages.denominator}</dt><dd>{dimension.denominator ?? "—"}</dd></div>
                  <div><dt>{messages.appliedWeight}</dt><dd>{weight ?? "—"}</dd></div>
                  <div><dt>{messages.qualityModel}</dt><dd><code>{quality.model_version}</code></dd></div>
                  <div><dt>{messages.rawReason}</dt><dd><code>{dimension.reason ?? "—"}</code></dd></div>
                </dl>
              </details>
            </article>
          );
        })}
      </div>

      <div className="quality-findings-flow">
        <FindingsSection
          title={messages.qualityFindings}
          description={messages.qualityFindingsDescription}
          emptyMessage={messages.noQualityFindings}
          findings={quality.findings}
          evidence={quality.evidence}
          columns={profiling.columns}
          source="Quality"
          modelVersion={quality.model_version}
          compact
        />
        <FindingsSection
          title={messages.profilingSignals}
          description={messages.profilingSignalsDescription}
          findings={profiling.findings}
          evidence={profiling.evidence}
          columns={profiling.columns}
          source="Profiling"
          modelVersion={profiling.model_version}
          subdued
          compact
        />
      </div>
    </section>
  );
}
