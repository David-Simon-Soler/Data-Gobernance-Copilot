"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import { label, pct } from "../../lib/format";
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
  if (value == null) return <>—</>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{typeof value === "number" ? value.toLocaleString() : value}</>;
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
            <p className="eyebrow">Column detail</p>
            <h3 id="column-detail-title">{column.name}</h3>
            <p>{label(column.inferred_primitive_type)} · <code>{column.physical_dtype}</code></p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="text-button"
            onClick={onClose}
            aria-label={`Close details for ${column.name}`}
          >
            Close
          </button>
        </header>

        <div className="column-detail-body">
          <section aria-labelledby="column-profile-title">
            <div className="column-detail-section-heading">
              <h4 id="column-profile-title">Profile</h4>
              <span>Canonical column metrics</span>
            </div>
            <dl className="column-profile-grid">
              <div><dt>Complete</dt><dd>{pct(1 - column.null_ratio)}</dd></div>
              <div>
                <dt>Missing</dt>
                <dd>{column.null_count.toLocaleString()} · {pct(column.null_ratio)}</dd>
              </div>
              <div><dt>Distinct</dt><dd>{column.distinct_count.toLocaleString()}</dd></div>
              {column.uniqueness_ratio != null ? (
                <div><dt>Unique rate</dt><dd>{pct(column.uniqueness_ratio)}</dd></div>
              ) : null}
              <div>
                <dt>Identifier</dt>
                <dd>{column.is_candidate_identifier ? "Structural candidate" : "None"}</dd>
              </div>
            </dl>
            {column.is_candidate_identifier ? (
              <p className="column-candidate-note">
                Structural candidate only; not a confirmed primary key or semantic identifier.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="column-classifications-title">
            <div className="column-detail-section-heading">
              <h4 id="column-classifications-title">Classifications</h4>
              <span>
                {classifications.length.toLocaleString()} canonical classification
                {classifications.length === 1 ? "" : "s"}
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
                      {label(classification.assertion_level)} · {label(classification.confidence)} confidence
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No Governance classifications apply to this column.</p>
            )}
            {classifications.length ? (
              <details className="column-evidence-disclosure">
                <summary>Classification evidence</summary>
                <div className="column-evidence-list">
                  {classifications.map((classification) => (
                    <section
                      aria-label={`Evidence for ${label(classification.category)}`}
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
              <h4 id="column-findings-title">Findings</h4>
              <span>
                {relatedFindings.length.toLocaleString()} related finding
                {relatedFindings.length === 1 ? "" : "s"}
              </span>
            </div>
            {relatedFindings.length ? (
              <ul className="column-related-findings">
                {relatedFindings.map(({ source, finding }) => (
                  <li key={finding.id}>
                    <div>
                      <span>{source} · {label(finding.severity)}</span>
                      <strong>{finding.title}</strong>
                      <small>
                        {label(finding.assertion_level)} · {label(finding.confidence)} confidence
                      </small>
                    </div>
                    <details>
                      <summary>Evidence for {finding.title}</summary>
                      <div className="column-finding-evidence">
                        <p>{finding.description}</p>
                        <EvidenceContent
                          ids={finding.evidence_ids}
                          evidence={evidence}
                        />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No canonical findings are linked to this column.</p>
            )}
          </section>

          <details className="column-technical-details">
            <summary>Technical details</summary>
            <div className="column-technical-content">
              <dl className="column-detail-grid">
                <div><dt>Zero-based position</dt><dd>{column.position}</dd></div>
                <div><dt>Physical dtype</dt><dd><code>{column.physical_dtype}</code></dd></div>
                <div><dt>Row count</dt><dd>{column.row_count.toLocaleString()}</dd></div>
                <div><dt>Non-null count</dt><dd>{column.non_null_count.toLocaleString()}</dd></div>
                <div><dt>Null count</dt><dd>{column.null_count.toLocaleString()}</dd></div>
                <div><dt>Distinct count</dt><dd>{column.distinct_count.toLocaleString()}</dd></div>
                <div><dt>Null rate</dt><dd>{pct(column.null_ratio)}</dd></div>
                <div><dt>Unique rate</dt><dd>{pct(column.uniqueness_ratio)}</dd></div>
                <div><dt>Cardinality ratio</dt><dd>{pct(column.cardinality_ratio)}</dd></div>
                <div><dt>Duplicate excess</dt><dd>{column.duplicate_excess_rows.toLocaleString()}</dd></div>
                <div><dt>Constant</dt><dd>{column.is_constant ? "Yes" : "No"}</dd></div>
                <div><dt>All null</dt><dd>{column.is_all_null ? "Yes" : "No"}</dd></div>
                <div><dt>Candidate identifier</dt><dd>{column.is_candidate_identifier ? "Candidate" : "No"}</dd></div>
                <div><dt>Candidate reason</dt><dd>{column.candidate_identifier_reason ?? "—"}</dd></div>
              </dl>

              {column.candidate_identifier ? (
                <section aria-label={`Candidate identifier evidence for ${column.name}`}>
                  <p className="column-detail-title">Candidate identifier evidence</p>
                  <dl className="column-detail-grid">
                    <div><dt>Kind</dt><dd>{label(column.candidate_identifier.kind)}</dd></div>
                    <div><dt>Reason</dt><dd>{column.candidate_identifier.reason}</dd></div>
                    <div><dt>Name signal</dt><dd>{column.candidate_identifier.name_signal ? "Yes" : "No"}</dd></div>
                    <div><dt>Completeness</dt><dd>{pct(column.candidate_identifier.completeness)}</dd></div>
                    <div><dt>Uniqueness</dt><dd>{pct(column.candidate_identifier.uniqueness)}</dd></div>
                    <div><dt>Confirmed key</dt><dd>{column.candidate_identifier.confirmed_key ? "Yes" : "No"}</dd></div>
                  </dl>
                </section>
              ) : null}

              {statistics.length ? (
                <section aria-label={`Aggregate statistics for ${column.name}`}>
                  <p className="column-detail-title">Safe aggregate statistics</p>
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
                <section aria-label={`Quality signals for ${column.name}`}>
                  <p className="column-detail-title">Safe quality signals</p>
                  <dl className="column-detail-grid">
                    <div><dt>Primitive type</dt><dd>{label(signals.primitive_type)}</dd></div>
                    <div><dt>Non-null count</dt><dd>{signals.non_null_count.toLocaleString()}</dd></div>
                    <div><dt>Valid non-null count</dt><dd>{signals.valid_non_null_count.toLocaleString()}</dd></div>
                    <div><dt>Invalid count</dt><dd>{signals.invalid_count.toLocaleString()}</dd></div>
                    <div><dt>Recognized format family</dt><dd>{signals.has_recognized_format_family ? "Yes" : "No"}</dd></div>
                  </dl>
                  {signals.format_family_counts.length ? (
                    <ul className="format-family-counts">
                      {signals.format_family_counts.map(([family, count]) => (
                        <li key={family}>{label(family)}: {count.toLocaleString()}</li>
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
        <div className="filters" role="group" aria-label="Column inventory filters">
          <label>
            Search columns
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Column name"
            />
          </label>
          <label>
            Classification
            <select
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
            >
              <option value="all">All classifications</option>
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
              Clear filters
            </button>
          ) : null}
        </div>

        <p className="column-result-count" role="status" aria-live="polite">
          {shown.length.toLocaleString()} of {columns.length.toLocaleString()} columns
        </p>
      </div>

      <div
        className="table-wrap column-inventory-table"
        role="region"
        aria-label="Scrollable column inventory"
        tabIndex={0}
      >
        <table>
          <caption>
            Structural column metrics joined with canonical Governance classifications.
          </caption>
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Type</th>
              <th scope="col">Complete</th>
              <th scope="col">Distinct / unique</th>
              <th scope="col">Identifier</th>
              <th scope="col">Classification</th>
              <th scope="col"><span className="visually-hidden">Inspect</span></th>
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
                      {column.distinct_count.toLocaleString()} distinct
                    </span>
                    {column.uniqueness_ratio != null ? (
                      <span className="column-secondary-metric">
                        {pct(column.uniqueness_ratio)} unique
                      </span>
                    ) : null}
                  </td>
                  <td>{column.is_candidate_identifier ? "Candidate" : "—"}</td>
                  <td>
                    {canonicalClassifications.length ? (
                      <ul
                        className="column-classifications"
                        aria-label={`Governance classifications for ${column.name}`}
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
                      Inspect
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
          No columns match the current filters. Adjust or clear the filters to continue.
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
