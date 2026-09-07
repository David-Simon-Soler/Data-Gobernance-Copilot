"use client";

import { useMemo, useState } from "react";
import { label, pct } from "../../lib/format";
import type {
  ColumnProfile,
  GovernanceClassification,
} from "../../types/api";

function DetailValue({ value }: { value: number | string | boolean | null }) {
  if (value == null) return <>—</>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  return <>{typeof value === "number" ? value.toLocaleString() : value}</>;
}

function ColumnDetails({ column }: { column: ColumnProfile }) {
  const statistics = Object.entries(column.basic_statistics ?? {}).filter(
    ([, value]) => value != null,
  );
  const signals = column.quality_signals;

  return (
    <details className="column-details">
      <summary aria-label={`View details for ${column.name}`}>View details</summary>
      <div className="column-detail-content">
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
  );
}

export function ColumnInventory({
  columns,
  governanceClassifications,
}: {
  columns: ColumnProfile[];
  governanceClassifications: GovernanceClassification[];
}) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");

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

  return (
    <>
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

      <div
        className="table-wrap"
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
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Missing</th>
              <th scope="col">Distinct</th>
              <th scope="col">Identifier</th>
              <th scope="col">Classifications</th>
              <th scope="col">Details</th>
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
                  <td>{column.null_count.toLocaleString()} · {pct(column.null_ratio)}</td>
                  <td>{column.distinct_count.toLocaleString()}</td>
                  <td>{column.is_candidate_identifier ? "Candidate" : "—"}</td>
                  <td>
                    {canonicalClassifications.length ? (
                      <ul
                        className="column-classifications"
                        aria-label={`Governance classifications for ${column.name}`}
                      >
                        {canonicalClassifications.map((item) => (
                          <li key={item.id}>{label(item.category)}</li>
                        ))}
                      </ul>
                    ) : "—"}
                  </td>
                  <td><ColumnDetails column={column} /></td>
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
    </>
  );
}
