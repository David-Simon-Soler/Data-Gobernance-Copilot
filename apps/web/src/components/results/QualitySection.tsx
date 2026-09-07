import { label, qualityReason, scorePercent } from "../../lib/format";
import type { AnalysisResponse } from "../../types/api";
import { FindingsSection } from "./FindingCard";

export function QualitySection({
  analysis,
}: {
  analysis: AnalysisResponse["analysis"];
}) {
  const { profiling, quality } = analysis;
  const weights = new Map(quality.applied_weights ?? []);

  return (
    <section id="quality" aria-labelledby="quality-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Deterministic structural assessment</p>
          <h2 id="quality-title">Quality</h2>
        </div>
        <p className="section-intro">
          Exact V0.1 results for structural completeness, uniqueness, validity,
          and consistency. This is not a compliance or risk score.
        </p>
      </div>

      <div className="quality-overview">
        <div className="quality-score">
          <span>Overall structural quality</span>
          <strong>{quality.overall_score ?? "N/A"}</strong>
          <span>
            {quality.overall_score == null ? "Not applicable" : "/ 100"}
          </span>
        </div>
        <div className="observed-completeness">
          <span>Observed dataset completeness</span>
          <strong>{scorePercent(quality.observed_completeness)}</strong>
          <p>Non-null cells observed across the dataset.</p>
        </div>
      </div>

      <div className="dimension-list" role="group" aria-label="Quality dimensions">
        {quality.dimensions.map((dimension) => {
          const reason = qualityReason(dimension.reason);
          const weight = weights.get(dimension.name);
          return (
            <article className="dimension-row" key={dimension.name}>
              <div>
                <h3>{label(dimension.name)}</h3>
                <span className="applicability">
                  {label(dimension.applicability)}
                </span>
              </div>
              <strong className="dimension-score">
                {dimension.score == null
                  ? "N/A"
                  : `${dimension.score.toFixed(1).replace(/\.0$/, "")} / 100`}
              </strong>
              {reason ? <p>{reason}</p> : null}
              <details className="technical">
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

      <FindingsSection
        title="Structural profiling signals"
        findings={profiling.findings}
        evidence={profiling.evidence}
        columns={profiling.columns}
        source="Profiling"
        modelVersion={profiling.model_version}
      />
      <FindingsSection
        title="Quality Engine findings"
        findings={quality.findings}
        evidence={quality.evidence}
        columns={profiling.columns}
        source="Quality"
        modelVersion={quality.model_version}
      />
    </section>
  );
}
