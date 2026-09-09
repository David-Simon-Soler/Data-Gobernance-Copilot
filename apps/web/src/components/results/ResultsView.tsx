"use client";

import { useLanguage } from "../../i18n/LanguageProvider";
import type { AnalysisResponse } from "../../types/api";
import { LanguageSwitcher } from "../LanguageSwitcher";
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
  const { messages, number } = useLanguage();
  const { analysis } = response;
  const columnFindings = [
    ...analysis.profiling.findings.map((finding) => ({
      source: "Profiling" as const,
      finding,
    })),
    ...analysis.quality.findings.map((finding) => ({
      source: "Quality" as const,
      finding,
    })),
    ...analysis.governance.findings.map((finding) => ({
      source: "Governance" as const,
      finding,
    })),
  ];
  const columnEvidence = [
    ...analysis.profiling.evidence,
    ...analysis.quality.evidence,
    ...analysis.governance.evidence,
  ];

  return (
    <>
      <a className="skip-link" href="#analysis-results">
        {messages.skipResults}
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <strong>Data Governance Copilot</strong>
          <div className="app-header-actions">
            <LanguageSwitcher />
            <button onClick={onReset} className="button secondary">
              {messages.analyzeAnother}
            </button>
          </div>
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
          <div className="section-heading">
            <div>
              <p className="eyebrow">{messages.datasetSchema}</p>
              <h2 id="columns-title">{messages.columnInventory}</h2>
            </div>
            <p className="section-intro">
              {number(analysis.profiling.columns.length)} {messages.columnInventoryIntro}
            </p>
          </div>
          <ColumnInventory
            columns={analysis.profiling.columns}
            governanceClassifications={analysis.governance.classifications}
            relatedFindings={columnFindings}
            evidence={columnEvidence}
          />
        </section>
      </main>
    </>
  );
}
