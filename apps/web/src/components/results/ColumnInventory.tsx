"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import { useLanguage } from "../../i18n/LanguageProvider";
import { countText, findingText, interpolate } from "../../i18n/translations";
import { pct } from "../../lib/format";
import type {
  ColumnProfile,
  Evidence,
  Finding,
  GovernanceClassification,
} from "../../types/api";
import { EvidenceContent } from "./EvidenceBox";

interface RelatedFinding {
  source: "Profiling" | "Quality" | "Governance";
  finding: Finding;
}

const EMPTY_FINDINGS: RelatedFinding[] = [];
const EMPTY_EVIDENCE: Evidence[] = [];

function DetailValue({ value }: { value: number | string | boolean | null }) {
  const { messages, number } = useLanguage();
  if (value == null) return <>—</>;
  if (typeof value === "boolean") return <>{value ? messages.yes : messages.no}</>;
  return <>{typeof value === "number" ? number(value) : value}</>;
}

function ColumnDetailPanel({
  column,
  classifications,
  relatedFindings,
  evidence,
  closeButtonRef,
  panelRef,
  onClose,
}: {
  column: ColumnProfile;
  classifications: GovernanceClassification[];
  relatedFindings: RelatedFinding[];
  evidence: Evidence[];
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const { locale, messages, label, number } = useLanguage();
  const statistics = Object.entries(column.basic_statistics ?? {}).filter(
    ([, value]) => value != null,
  );
  const signals = column.quality_signals;

  return (
    <div className="column-detail-layer">
      <div className="column-detail-scrim" aria-hidden="true" />
      <aside
        ref={panelRef}
        className="column-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-detail-title"
      >
        <header className="column-detail-header">
          <div>
            <p className="eyebrow">{messages.columnDetail}</p>
            <h3 id="column-detail-title">{column.name}</h3>
            <p>{label(column.inferred_primitive_type)} · <code>{column.physical_dtype}</code></p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="text-button"
            onClick={onClose}
            aria-label={`${messages.closeDetails} ${column.name}`}
          >
            {messages.close}
          </button>
        </header>

        <div className="column-detail-body">
          <section aria-labelledby="column-profile-title">
            <div className="column-detail-section-heading">
              <h4 id="column-profile-title">{messages.profile}</h4>
              <span>{messages.canonicalMetrics}</span>
            </div>
            <dl className="column-profile-grid">
              <div><dt>{messages.complete}</dt><dd>{pct(1 - column.null_ratio)}</dd></div>
              <div>
                <dt>{messages.missing}</dt>
                <dd>{number(column.null_count)} · {pct(column.null_ratio)}</dd>
              </div>
              <div><dt>{messages.distinct}</dt><dd>{number(column.distinct_count)}</dd></div>
              {column.uniqueness_ratio != null ? (
                <div><dt>{messages.uniqueRate}</dt><dd>{pct(column.uniqueness_ratio)}</dd></div>
              ) : null}
              <div>
                <dt>{messages.identifier}</dt>
                <dd>{column.is_candidate_identifier ? messages.structuralCandidate : messages.none}</dd>
              </div>
            </dl>
            {column.is_candidate_identifier ? (
              <p className="column-candidate-note">
                {messages.candidateNote}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="column-classifications-title">
            <div className="column-detail-section-heading">
              <h4 id="column-classifications-title">{messages.classifications}</h4>
              <span>
                {countText(classifications.length, messages.canonicalClassificationNoun, locale)}
              </span>
            </div>
            {classifications.length ? (
              <ul className="column-detail-classifications">
                {classifications.map((classification) => (
                  <li
                    className={
                      classification.category === "POTENTIAL_PERSONAL_DATA"
                        ? "potential-personal-data"
                        : ""
                    }
                    key={classification.id}
                  >
                    <strong>{label(classification.category)}</strong>
                    <span>
                      {label(classification.assertion_level)} · {label(classification.confidence)} {messages.confidenceLower}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{messages.noColumnGovernanceClassifications}</p>
            )}
            {classifications.length ? (
              <details className="column-evidence-disclosure">
                <summary>{messages.classificationEvidence}</summary>
                <div className="column-evidence-list">
                  {classifications.map((classification) => (
                    <section
                      aria-label={`${messages.evidenceFor} ${label(classification.category)}`}
                      key={classification.id}
                    >
                      <strong>{label(classification.category)}</strong>
                      <EvidenceContent
                        ids={classification.evidence_ids}
                        evidence={evidence}
                      />
                    </section>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section aria-labelledby="column-findings-title">
            <div className="column-detail-section-heading">
              <h4 id="column-findings-title">{messages.findings}</h4>
              <span>
                {countText(relatedFindings.length, messages.relatedFindingNoun, locale)}
              </span>
            </div>
            {relatedFindings.length ? (
              <ul className="column-related-findings">
                {relatedFindings.map(({ source, finding }) => {
                  const translated = findingText(finding, locale, evidence, column.name);
                  return (
                    <li key={finding.id}>
                      <div>
                        <span>{label(source)} · {label(finding.severity)}</span>
                        <strong>{translated.title}</strong>
                        <small>
                          {label(finding.assertion_level)} · {label(finding.confidence)} {messages.confidenceLower}
                        </small>
                      </div>
                      <details>
                        <summary>{messages.evidenceForFinding} {translated.title}</summary>
                        <div className="column-finding-evidence">
                          <p>{translated.description}</p>
                          <EvidenceContent
                            ids={finding.evidence_ids}
                            evidence={evidence}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">{messages.noLinkedFindings}</p>
            )}
          </section>

          <details className="column-technical-details">
            <summary>{messages.technicalDetails}</summary>
            <div className="column-technical-content">
              <dl className="column-detail-grid">
                <div><dt>{messages.zeroBasedPosition}</dt><dd>{column.position}</dd></div>
                <div><dt>{messages.physicalDtype}</dt><dd><code>{column.physical_dtype}</code></dd></div>
                <div><dt>{messages.rowCount}</dt><dd>{number(column.row_count)}</dd></div>
                <div><dt>{messages.nonNullCount}</dt><dd>{number(column.non_null_count)}</dd></div>
                <div><dt>{messages.nullCount}</dt><dd>{number(column.null_count)}</dd></div>
                <div><dt>{messages.distinctCount}</dt><dd>{number(column.distinct_count)}</dd></div>
                <div><dt>{messages.nullRate}</dt><dd>{pct(column.null_ratio)}</dd></div>
                <div><dt>{messages.uniqueRate}</dt><dd>{pct(column.uniqueness_ratio)}</dd></div>
                <div><dt>{messages.cardinalityRatio}</dt><dd>{pct(column.cardinality_ratio)}</dd></div>
                <div><dt>{messages.duplicateExcess}</dt><dd>{number(column.duplicate_excess_rows)}</dd></div>
                <div><dt>{messages.constant}</dt><dd>{column.is_constant ? messages.yes : messages.no}</dd></div>
                <div><dt>{messages.allNull}</dt><dd>{column.is_all_null ? messages.yes : messages.no}</dd></div>
                <div><dt>{messages.candidateIdentifier}</dt><dd>{column.is_candidate_identifier ? messages.candidate : messages.no}</dd></div>
                <div><dt>{messages.candidateReason}</dt><dd>{column.candidate_identifier_reason ?? "—"}</dd></div>
              </dl>

              {column.candidate_identifier ? (
                <section aria-label={`${messages.candidateEvidence} ${column.name}`}>
                  <p className="column-detail-title">{messages.candidateEvidence}</p>
                  <dl className="column-detail-grid">
                    <div><dt>{messages.kind}</dt><dd>{label(column.candidate_identifier.kind)}</dd></div>
                    <div><dt>{messages.reason}</dt><dd>{column.candidate_identifier.reason}</dd></div>
                    <div><dt>{messages.nameSignal}</dt><dd>{column.candidate_identifier.name_signal ? messages.yes : messages.no}</dd></div>
                    <div><dt>{messages.completeness}</dt><dd>{pct(column.candidate_identifier.completeness)}</dd></div>
                    <div><dt>{messages.uniqueness}</dt><dd>{pct(column.candidate_identifier.uniqueness)}</dd></div>
                    <div><dt>{messages.confirmedKey}</dt><dd>{column.candidate_identifier.confirmed_key ? messages.yes : messages.no}</dd></div>
                  </dl>
                </section>
              ) : null}

              {statistics.length ? (
                <section aria-label={`${messages.aggregateStats} ${column.name}`}>
                  <p className="column-detail-title">{messages.safeAggregateStats}</p>
                  <dl className="column-detail-grid">
                    {statistics.map(([name, value]) => (
                      <div key={name}>
                        <dt>{label(name)}</dt>
                        <dd><DetailValue value={value} /></dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {signals ? (
                <section aria-label={`${messages.qualitySignalsFor} ${column.name}`}>
                  <p className="column-detail-title">{messages.safeQualitySignals}</p>
                  <dl className="column-detail-grid">
                    <div><dt>{messages.primitiveType}</dt><dd>{label(signals.primitive_type)}</dd></div>
                    <div><dt>{messages.nonNullCount}</dt><dd>{number(signals.non_null_count)}</dd></div>
                    <div><dt>{messages.validNonNullCount}</dt><dd>{number(signals.valid_non_null_count)}</dd></div>
                    <div><dt>{messages.invalidCount}</dt><dd>{number(signals.invalid_count)}</dd></div>
                    <div><dt>{messages.recognizedFormat}</dt><dd>{signals.has_recognized_format_family ? messages.yes : messages.no}</dd></div>
                  </dl>
                  {signals.format_family_counts.length ? (
                    <ul className="format-family-counts">
                      {signals.format_family_counts.map(([family, count]) => (
                        <li key={family}>{label(family)}: {number(count)}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

export function ColumnInventory({
  columns,
  governanceClassifications,
  relatedFindings = EMPTY_FINDINGS,
  evidence = EMPTY_EVIDENCE,
}: {
  columns: ColumnProfile[];
  governanceClassifications: GovernanceClassification[];
  relatedFindings?: RelatedFinding[];
  evidence?: Evidence[];
}) {
  const { messages, label, number } = useLanguage();
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const detailPanelRef = useRef<HTMLElement | null>(null);

  const classificationsByColumn = useMemo(() => {
    const joined = new Map<string, GovernanceClassification[]>();
    for (const item of governanceClassifications) {
      const current = joined.get(item.column_id) ?? [];
      current.push(item);
      joined.set(item.column_id, current);
    }
    return joined;
  }, [governanceClassifications]);

  const classificationOptions = useMemo(
    () =>
      [...new Set(governanceClassifications.map((item) => item.category))].sort(),
    [governanceClassifications],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const shown = useMemo(
    () => columns.filter((column) => {
      const classifications = classificationsByColumn.get(column.column_id) ?? [];
      return (
        column.name.toLowerCase().includes(normalizedQuery) &&
        (classification === "all" ||
          classifications.some((item) => item.category === classification))
      );
    }),
    [classification, classificationsByColumn, columns, normalizedQuery],
  );
  const filtersActive = normalizedQuery.length > 0 || classification !== "all";
  const selectedColumn =
    columns.find((column) => column.column_id === selectedColumnId) ?? null;
  const selectedClassifications = selectedColumn
    ? classificationsByColumn.get(selectedColumn.column_id) ?? []
    : [];
  const selectedFindings = selectedColumn
    ? relatedFindings.filter(({ finding }) =>
        finding.subject === selectedColumn.column_id ||
        finding.subject === selectedColumn.name ||
        selectedColumn.findings.includes(finding.id),
      )
    : [];

  const closeDetails = useCallback(() => {
    detailTriggerRef.current?.focus();
    setSelectedColumnId(null);
  }, []);

  useEffect(() => {
    if (!selectedColumn) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDetails();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = detailPanelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDetails, selectedColumn]);

  return (
    <>
      <div className="column-inventory-toolbar">
        <div className="filters" role="group" aria-label={messages.inventoryFilters}>
          <label>
            {messages.searchColumns}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.columnName}
            />
          </label>
          <label>
            {messages.classification}
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
            >
              <option value="all">{messages.allClassificationsFilter}</option>
              {classificationOptions.map((category) => (
                <option key={category} value={category}>{label(category)}</option>
              ))}
            </select>
          </label>
          {filtersActive ? (
            <button
              type="button"
              className="text-button clear-filters"
              onClick={() => {
                setQuery("");
                setClassification("all");
              }}
            >
              {messages.clearFilters}
            </button>
          ) : null}
        </div>

        <p className="column-result-count" role="status" aria-live="polite">
          {interpolate(messages.showingColumns, { shown: number(shown.length), total: number(columns.length) })}
        </p>
      </div>

      <div
        className="table-wrap column-inventory-table"
        role="region"
        aria-label={messages.scrollableInventory}
        tabIndex={0}
      >
        <table>
          <caption>
            {messages.inventoryCaption}
          </caption>
          <thead>
            <tr>
              <th scope="col">{messages.columnHeader}</th>
              <th scope="col">{messages.type}</th>
              <th scope="col">{messages.complete}</th>
              <th scope="col">{messages.distinctUnique}</th>
              <th scope="col">{messages.identifier}</th>
              <th scope="col">{messages.classification}</th>
              <th scope="col"><span className="visually-hidden">{messages.inspect}</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((column) => {
              const canonicalClassifications =
                classificationsByColumn.get(column.column_id) ?? [];
              return (
                <tr key={column.column_id}>
                  <th scope="row" title={column.name}>{column.name}</th>
                  <td>{label(column.inferred_primitive_type)}</td>
                  <td>{pct(1 - column.null_ratio)}</td>
                  <td>
                    <span className="column-primary-metric">
                      {number(column.distinct_count)} {messages.distinctLower}
                    </span>
                    {column.uniqueness_ratio != null ? (
                      <span className="column-secondary-metric">
                        {pct(column.uniqueness_ratio)} {messages.uniqueLower}
                      </span>
                    ) : null}
                  </td>
                  <td>{column.is_candidate_identifier ? messages.candidate : "—"}</td>
                  <td>
                    {canonicalClassifications.length ? (
                      <ul
                        className="column-classifications"
                        aria-label={`${messages.governanceClassificationsFor} ${column.name}`}
                      >
                        {canonicalClassifications.map((item) => (
                          <li
                            className={
                              item.category === "POTENTIAL_PERSONAL_DATA"
                                ? "potential-personal-data"
                                : ""
                            }
                            key={item.id}
                          >
                            {label(item.category)}
                          </li>
                        ))}
                      </ul>
                    ) : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-button column-inspect"
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        detailTriggerRef.current = event.currentTarget;
                        setSelectedColumnId(column.column_id);
                      }}
                    >
                      {messages.inspect}
                      <span className="visually-hidden"> {column.name}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!shown.length ? (
        <p className="empty" role="status">
          {messages.noColumnsAdjust}
        </p>
      ) : null}

      {selectedColumn ? (
        <ColumnDetailPanel
          column={selectedColumn}
          classifications={selectedClassifications}
          relatedFindings={selectedFindings}
          evidence={evidence}
          closeButtonRef={closeButtonRef}
          panelRef={detailPanelRef}
          onClose={closeDetails}
        />
      ) : null}
    </>
  );
}
