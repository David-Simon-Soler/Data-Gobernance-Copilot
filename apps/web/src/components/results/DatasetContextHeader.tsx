"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "../../i18n/LanguageProvider";
import { scorePercent } from "../../lib/format";
import type { AnalysisResponse } from "../../types/api";

interface DatasetContextHeaderProps {
  response: AnalysisResponse;
  isSyntheticDemo: boolean;
}

export function DatasetContextHeader({
  response,
  isSyntheticDemo,
}: DatasetContextHeaderProps) {
  const { messages, number, label } = useLanguage();
  const title = useRef<HTMLHeadingElement>(null);
  const { metadata, analysis } = response;
  const { quality, governance, recommendations } = analysis;

  useEffect(() => {
    title.current?.focus();
  }, []);

  const metrics = [
    {
      label: messages.structuralQuality,
      value: quality.overall_score ?? "N/A",
      suffix: quality.overall_score == null ? label("NOT_APPLICABLE") : "/ 100",
    },
    {
      label: messages.observedCompleteness,
      value:
        quality.observed_completeness == null
          ? "N/A"
          : scorePercent(quality.observed_completeness),
      suffix:
        quality.observed_completeness == null ? label("NOT_APPLICABLE") : undefined,
    },
    {
      label: messages.qualityFindings,
      value: number(quality.findings.length),
    },
    {
      label: messages.governanceClassifications,
      value: number(governance.classifications.length),
    },
    {
      label: messages.recommendations,
      value: number(recommendations.summary.total_count),
    },
  ];

  return (
    <section className="dataset-header" aria-labelledby="dataset-title">
      <div className="dataset-header-inner">
        <div className="dataset-identity">
          <div>
            <p className="eyebrow status-label">{messages.analysisComplete}</p>
            {isSyntheticDemo ? (
              <p className="synthetic-result-label">{messages.syntheticDataset}</p>
            ) : null}
            <h1
              ref={title}
              id="dataset-title"
              tabIndex={-1}
              title={metadata.source_filename}
            >
              {metadata.source_filename}
            </h1>
          </div>
          <span className="format-badge">{metadata.source_format.toUpperCase()}</span>
        </div>

        <p className="dataset-context">
          {metadata.sheet_name ? <span>{messages.sheet}: {metadata.sheet_name}</span> : null}
          <span>{number(metadata.row_count)} {metadata.row_count === 1 ? messages.row : messages.rows}</span>
          <span>{number(metadata.column_count)} {metadata.column_count === 1 ? messages.column : messages.columns.toLowerCase()}</span>
        </p>

        <div className="dataset-metrics" role="group" aria-label={messages.reviewSummary}>
          {metrics.map((metric) => (
            <div
              className="dataset-metric"
              key={metric.label}
              role="group"
              aria-label={
                metric.label === messages.structuralQuality
                  ? messages.overallStructuralQuality
                  : metric.label
              }
            >
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              {metric.suffix ? <small>{metric.suffix}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
