import { label, qualityReason } from "../../lib/format";
import type { AnalysisResponse } from "../../types/api";
import { FindingsSection } from "./FindingCard";

const scoreLabel = (score: number | null) =>
  score == null ? "N/A" : `${score.toFixed(1).replace(/\.0$/, "")} / 100`;

export function QualitySection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { profiling, quality } = analysis;
  const weights = new Map(quality.applied_weights ?? []);

  return (
    <section id="quality" className="quality-section" aria-labelledby="quality-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Deterministic structural assessment</p>
          <h2 id="quality-title">Quality</h2>
        </div>
        <p className="section-intro">
          Understand how the applicable V0.1 dimensions produce the structural
          score, then inspect the findings and their evidence.
        </p>
      </div>

      <div className="quality-assessment" aria-label="Structural assessment">
        <div className="quality-score quality-assessment-score">
          <span>Overall structural quality</span>
          <div>
            <strong>{quality.overall_score ?? "N/A"}</strong>
            <span>
              {quality.overall_score == null ? "Not applicable" : "/ 100"}
            </span>
          </div>
        </div>
        <p>
          The score uses only applicable deterministic V0.1 dimensions. It is
          not a compliance or risk score.
        </p>
      </div>

      <div className="quality-dimensions-heading">
        <h3>Dimensions</h3>
        <p>Exact scores and applicability from the current quality model.</p>
      </div>

      <div
        className="quality-dimension-list"
        role="group"
        aria-label="Quality dimensions"
      >
        {quality.dimensions.map((dimension) => {
          const reason = qualityReason(dimension.reason);
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
                  aria-label={`${label(dimension.name)} score`}
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
                <summary>Technical details</summary>
                <dl className="technical-grid">
                  <div><dt>Applicability</dt><dd><code>{dimension.applicability}</code></dd></div>
                  <div><dt>Numerator</dt><dd>{dimension.numerator ?? "—"}</dd></div>
                  <div><dt>Denominator</dt><dd>{dimension.denominator ?? "—"}</dd></div>
                  <div><dt>Applied weight</dt><dd>{weight ?? "—"}</dd></div>
                  <div><dt>Quality model</dt><dd><code>{quality.model_version}</code></dd></div>
                  <div><dt>Raw reason</dt><dd><code>{dimension.reason ?? "—"}</code></dd></div>
                </dl>
              </details>
            </article>
          );
        })}
      </div>

      <div className="quality-findings-flow">
        <FindingsSection
          title="Quality findings"
          description="Detected findings from the Quality Engine, ordered for evidence-first review."
          emptyMessage="No findings were produced by the current V0.1 quality rules."
          findings={quality.findings}
          evidence={quality.evidence}
          columns={profiling.columns}
          source="Quality"
          modelVersion={quality.model_version}
          compact
        />
        <FindingsSection
          title="Profiling signals"
          description="Structural inferences, not confirmed primary keys or semantic identifiers."
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
