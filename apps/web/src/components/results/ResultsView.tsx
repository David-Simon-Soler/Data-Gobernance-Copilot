"use client";

import type { AnalysisResponse } from "../../types/api";
import { ColumnInventory } from "./ColumnInventory";
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
        <span>Data Governance Copilot</span>
        <div className="result-reset">
          {isSyntheticDemo ? <span>Ready to analyze your own file?</span> : null}
          <button onClick={onReset} className="button secondary">
            Analyze another dataset
          </button>
        </div>
      </header>
      <ResultNavigation />
      <main id="analysis-results" className="results" tabIndex={-1}>
        <OverviewSection response={response} isSyntheticDemo={isSyntheticDemo} />

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
