# Frontend & UX Contract V0.1

## Purpose

This document is the canonical contract and implementation status for the Phase 8 web experience of Data Governance Copilot. It defines presentation and interaction only; the backend remains the authoritative implementation of ingestion, profiling, quality, governance and recommendations.

The product is an evidence-first, deterministic dataset assessment tool. It is not a generic BI dashboard, spreadsheet editor, chat assistant, compliance certification, or SaaS workspace.

## Current state and boundaries

The implemented V0.1 frontend lives in `apps/web/`. The browser calls `POST /api/v1/analyze` directly through the configurable `NEXT_PUBLIC_API_BASE_URL`; there is no Next.js API proxy. The frontend does not access engines directly or duplicate backend rules. Results are ephemeral client state; refresh returns to upload and no local/session storage is used. Backend dependency declarations include the runtime/test packages required to run and validate this integration, without changing engine semantics.

## Route architecture and journey

Use one primary route, `/`, for the complete flow: entry/upload, processing and results. A second `/analyze` route is unnecessary until a distinct navigable surface exists. The journey is:

`IDLE → FILE_SELECTED → SUBMITTING → SUCCESS | ERROR`

The user selects one CSV/XLSX, submits it, reviews the overview, quality, findings, governance, recommendations, evidence and columns, then chooses **Analyze another dataset**. That action clears file, result, error and sheet state before returning to upload. There is no login, account, history, billing, workspace or saved project.

## Entry and upload contract

Hero copy must identify Data Governance Copilot, explain “Upload a CSV or XLSX for deterministic profiling and governance signals”, and state: processed for this request, no dataset persistence in V0.1, no account required, maximum file size 5 MiB. It must not claim local-only processing, GDPR/compliance, encryption, AI or legal conclusions.

Upload supports drag-and-drop and file picker, shows filename, detected format and size, and provides replace/remove/analyze actions. Client preflight is limited to non-empty file, `.csv`/`.xlsx` extension (case-insensitive), and ≤5 MiB; the API remains authoritative. MIME type and filename are untrusted metadata. No browser-side dataset parsing is required.

The API supports an optional `sheet_name` for XLSX, but V0.1 frontend does not bundle an XLSX parser or invent sheet discovery. Explicit sheet selection is deferred unless a future API capability exposes safe sheet metadata. If supplied by a later UI, it is a literal name, never an index.

## Processing and errors

Submission is synchronous. The implementation shows an indeterminate loading state and status announcement, never fake percentages, and disables duplicate submission while processing. Stable API codes including `unsupported_format`, `file_too_large`, `request_too_large`, `invalid_request`, `sheet_not_applicable`, `malformed_dataset`, `empty_dataset`, `dataset_limit_exceeded`, `sheet_not_found` and generic server failure map to short safe messages and recovery actions. Unknown codes retain a generic safe fallback. Traceback, library text, paths, raw values and backend error detail are never rendered.

## Results information architecture

Order the result page as: **What was analyzed → Quality → Attention/findings → Governance signals → Recommended actions → Why trust this? → Column inventory**. Successful results include compact in-page navigation (Overview, Quality, Governance, Recommendations, Columns), sticky/near-sticky on desktop and horizontally scrollable on mobile; no sidebar or separate routes.

### Dataset summary

Show source format, row count, column count, selected sheet (when present), model/schema versions and warnings. Filename is escaped display text. Do not call this a completed data dictionary; use **Column inventory**, **Schema profile** or **Draft structural dictionary**.

### Quality

Show `overall_score` (0–100) only when non-null and label it as a structural deterministic assessment, never a compliance/risk score. Dimensions are Completeness, Uniqueness, Validity and Consistency. Render each canonical applicability state (`APPLICABLE`, `NOT_APPLICABLE`, `INSUFFICIENT_DATA`) and its reason; do not invent thresholds, semantic bands or confidence percentages. CSS bars/cards are sufficient; no chart library is required.

### Findings and evidence

Findings are first separated into QUALITY and GOVERNANCE sections. Within each source, order by runtime severity precedence, then affected column position/name where applicable, then rule/finding identity. They may be filtered by severity, assertion level and source; column grouping is not the top-level hierarchy. Each item exposes severity, assertion level, confidence, source/method, subject/affected column, title/description and linked evidence. Internal IDs are secondary in a collapsed **Technical details** disclosure. Evidence disclosure shows rule/model version, metric, aggregate observed value/denominator, affected-row count and sample policy; it never exposes raw rows, cell values or samples.

`DETECTED` means directly calculated fact; `INFERRED` means deterministic signal requiring review; `SUGGESTED` means a proposed action, not a fact. Severity (`INFO`, `WARNING`, `HIGH`, `CRITICAL`) and confidence (`LOW`, `MEDIUM`, `HIGH`) are independent and must not be presented as recommendation priority.

### Governance

Render deterministic classifications and count-based summaries, including **Potential personal data** and **Potential quasi-identifier**. Map runtime categories without claiming PII/GDPR or legal status. Show category, affected column, assertion/confidence, method, signals and evidence. Never create a governance/privacy/compliance/risk score.

### Recommendations

Show canonical priorities P0/P1/P2 with their existing meanings, action and rationale. Recommendations are suggestions, not alarms. Every recommendation must trace `finding_id` to its source finding and evidence; an expandable row, drawer or panel is sufficient. Do not invent priority, severity or legal conclusions.

### Columns

The inventory must remain usable for 250 columns: compact table, name search, classification filter and progressive disclosure. Display name/position, physical and inferred primitive type, null count/rate, distinct/uniqueness/cardinality, candidate-identifier signal, classifications and safe basic statistics. Aggregate numeric/date statistics may be shown as technical details; raw category values, samples and cell contents are never rendered.

Warnings appear once in metadata and are visually distinct from findings. Empty states say “No findings were produced by current V0.1 rules”, never “clean”, “compliant” or “no risks”.

## Responsive, accessibility and visual language

Desktop is primary, with responsive cards, findings, recommendations, inventory and evidence for tablet/mobile. Core content must not require horizontal scrolling; only a genuinely wide column table may use controlled scrolling. Use semantic headings, labels, keyboard controls, visible focus, sufficient contrast, non-colour-only states, announcements for loading/errors, real buttons, reduced-motion support and responsive text sizing, targeting practical WCAG 2.2 AA principles without claiming certification.

Visual language is professional, technical, calm, editorial, credible and data/governance oriented, with a light-first mode: neutral backgrounds, restrained surfaces, subtle borders, strong hierarchy and intentional whitespace. Avoid neon AI, gradient-heavy heroes, glassmorphism, hacker aesthetics, excessive shadows/pills, huge sidebars, rainbow charts and stock photography. Use conceptual semantic roles for severity/priority/status; text and icons remain sufficient. Typography uses readable sans-serif display/section/body/metadata levels, with monospace only for technical IDs.

## Privacy, limitations and security

Concise copy may say: files are processed for this request; V0.1 does not persist datasets; raw rows are not returned; automated classifications may require human review. State that profiling uses deterministic rules/heuristics, governance signals are not legal determinations, and the tool does not certify regulatory compliance. Treat filename, column names, sheet names and finding text as untrusted escaped strings; no `dangerouslySetInnerHTML`, eval or client-side HTML rendering.

## API, state and derived values

The API base URL is environment-configurable (for example `NEXT_PUBLIC_API_BASE_URL`); production URLs are never hardcoded. The frontend consumes the complete response envelope and does not mutate it. Allowed derivations are formatting canonical rates, grouping/sorting existing objects and counting recommendations/classifications. It may not invent scores, thresholds, confidence percentages, severities, priorities or legal conclusions.

No export/download control is included until a real export contract exists. The bundled synthetic demo is the implemented Phase 9 fixture described below and uses the same analysis path as uploads. Phase 6 AI remains deferred: no chat, Ask AI, generated descriptions, sparkles, provider settings or AI explanations. Commercial SaaS UI is also out of scope.

## Implemented in Phase 8

The minimal Next.js/TypeScript application implements one `/` route, the `IDLE → FILE_SELECTED → SUBMITTING → SUCCESS | ERROR` state machine, CSV/XLSX preflight validation, a direct FastAPI client, safe error mapping, results navigation, quality and governance findings, recommendation traceability, contextual evidence disclosures, column name search and classification filtering. It does not parse datasets in the browser or add a state, chart or virtualization library.

Behavioral tests cover upload preflight, state transitions, network/API errors, result rendering, finding semantics, evidence, recommendation traceability and column filters. Phase 8 validation includes Vitest, standalone ESLint, TypeScript typecheck, production build and dependency audits.

## Phase 9.1 visual foundation

Phase 9.1 implements the approved editorial visual foundation, a clearer landing/upload hierarchy and a result Overview that keeps dataset identity, exact structural quality, review counts and ingestion warnings in the first viewport. The upload copy now states the actual ephemeral-processing boundaries, the Overview keeps engine/schema metadata in a secondary disclosure, and success moves keyboard focus to the result heading. No backend behavior, route, dependency, score interpretation or product boundary changed.

## Phase 9.2 analytical results

Phase 9.2 implements the human-first Quality, Governance, finding, evidence and recommendation presentation. Quality keeps observed dataset completeness separate from structural completeness, preserves applicability states, maps known reason codes to cautious readable copy and retains the raw codes, inputs, weights and model metadata in technical disclosures. Structural profiling signals and Quality Engine findings remain distinct sources.

Governance classifications are grouped by canonical `column_id` for presentation while every classification, signal, evidence link and governance finding remains available. The section shows count-based summaries and explicitly states that deterministic signals are for human review, not legal or compliance determinations. Findings prioritize title, description, affected field and full-text severity; stable finding anchors support exact recommendation traceability.

Recommendations with exactly matching priority, category, action, rationale and source are grouped visually. This does not mutate or deduplicate canonical recommendation objects: the canonical total, every recommendation ID and every source-finding/evidence relationship remain inspectable. Known ratio/rate/proportion evidence metrics are formatted as percentages; other numeric evidence remains numeric.

Phase 9.2b reduces repeated primary presentation without removing canonical detail: Governance findings remain available in one native disclosure with the exact count and stable anchors, while Quality model explanations remain in technical details.

## Phase 9.3 inventory, navigation and accessibility

The Column inventory now derives its classifications by joining `analysis.governance.classifications` to profile columns by canonical `column_id`; it does not mutate the response or require classifications on `ColumnProfile`. The compact table preserves source order, supports combined case-insensitive name and canonical-classification filters, and keeps safe aggregate profile and quality-signal detail in native per-column disclosures. Raw values, samples and duplicate row positions are never rendered.

Result navigation is sticky, horizontally scrollable on small screens and identifies exactly one visible section with `aria-current="location"`. Section and finding anchors account for the sticky offset. Responsive layouts keep intentional horizontal scrolling inside the result navigation and column table, with controls and metadata adapting at narrower widths.

The result state adds a keyboard-visible skip link, a labeled focusable table scroll region, caption and header scopes, logical landmarks/headings and request-error focus management. Successful analysis still focuses the result heading; ordinary client-side file validation does not unnecessarily move focus.

## Phase 9.4 synthetic demo

The upload state includes a secondary **Try the sample dataset** action for the bundled synthetic Customer Operations Sample. The frontend fetches the static asset, creates a browser `File` and passes it to the existing `analyzeDataset` client; the request follows the same FastAPI ingestion, profiling, Quality, Governance and Recommendations pipeline as a user upload. No demo response, score or classification is hardcoded.

Successful demo results carry the factual **Synthetic sample dataset** label and retain the normal **Analyze another dataset** reset, with a prompt to upload the visitor's own file. User uploads never receive the synthetic label. Asset and API failures use the same safe alert and focus treatment as upload failures, and the demo action remains available for retry. Dataset design, safety and actual observed output are documented in [SYNTHETIC_DEMO.md](SYNTHETIC_DEMO.md).

## Phase 9.5 final visual QA and polish

Phase 9.5 validates the real FastAPI and Next.js journey at desktop, tablet and mobile widths, including upload, loading, success, safe error recovery, reset, synthetic demo, sticky navigation, disclosures, recommendation anchors, keyboard focus and the controlled horizontal column table. Canonical column IDs continue to drive finding anchors and joins, while primary finding and recommendation copy now resolves them to readable column names. Named generic groups expose valid ARIA semantics, and obsolete badge code from the pre-Phase 9 presentation has been removed.

Automated browser accessibility checks report no confirmed violations; remaining colour-contrast items require manual review because their text sits on inherited transparent surfaces, and the reviewed palette retains readable dark text on light surfaces. This is a practical accessibility validation, not a certification.

## Deferred beyond Phase 9

Export and dedicated end-to-end browser test coverage remain deferred to Phase 10 or a later explicit contract. AI, persistence, accounts, authentication, history and SaaS workspace features remain outside V0.1 and are not implied by the implemented frontend.

## Contract status

Frontend UX contract APPROVED for V0.1. Phase 8 implementation, validation and commit are complete. Phase 9.1, Phase 9.2, Phase 9.2b, Phase 9.3, Phase 9.4 and Phase 9.5 are implemented and validated; Phase 9 is complete and Phase 10 is next. The decisions above are closed: one `/` route, source-oriented findings, compact in-page navigation, inline evidence disclosures, no XLSX sheet selector and no export UI.

## API/privacy conflict audit

The current response serializes canonical profiling/quality/governance/recommendation objects. `ColumnProfile.basic_statistics` includes aggregate fields such as minimum, maximum, mean, median and lengths; the frontend must keep these secondary and must not expose raw strings, category samples or cell values. This is compatible with `docs/API.md` when treated as aggregate technical detail. No frontend change may weaken the API serialization boundary.
