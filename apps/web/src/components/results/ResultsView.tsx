"use client";

import type { AnalysisResponse } from "../../types/api";
import { ColumnInventory } from "./ColumnInventory";
import { DatasetContextHeader } from "./DatasetContextHeader";
import { GovernanceSection } from "./GovernanceSection";
import { OverviewSection } from "./OverviewSection";
import { QualitySection } from "./QualitySection";
import { RecommendationsSection } from "./RecommendationsSection";
import { ResultNavigation } from "./ResultNavigation";

export function ResultsView({
  response,
  isSyntheticDemo,
  onReset,
}: {
  response: AnalysisResponse;
  isSyntheticDemo: boolean;
  onReset: () => void;
}) {
  const { analysis } = response;

  return (
    <>
      <a className="skip-link" href="#analysis-results">
        Skip to analysis results
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <strong>Data Governance Copilot</strong>
          <button onClick={onReset} className="button secondary">
            Analyze another dataset
          </button>
        </div>
      </header>
      <DatasetContextHeader
        response={response}
        isSyntheticDemo={isSyntheticDemo}
      />
      <ResultNavigation
        datasetName={response.metadata.source_filename}
        sourceFormat={response.metadata.source_format}
        overallScore={analysis.quality.overall_score}
      />
      <main id="analysis-results" className="results" tabIndex={-1}>
        <OverviewSection response={response} />

        <QualitySection analysis={analysis} />
        <GovernanceSection analysis={analysis} />
        <RecommendationsSection analysis={analysis} />

        <section id="columns" aria-labelledby="columns-title">
          <h2 id="columns-title">Column inventory</h2>
          <ColumnInventory
            columns={analysis.profiling.columns}
            governanceClassifications={analysis.governance.classifications}
          />
        </section>
      </main>
    </>
  );
}
