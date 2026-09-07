# Frontend & UX V0.1

## Current implementation

The implemented frontend lives in `apps/web/` and has one route, `/`. It is a Next.js and TypeScript presentation layer for the deterministic FastAPI analysis API. The browser calls `POST /api/v1/analyze` directly through `NEXT_PUBLIC_API_BASE_URL`; there is no Next.js API proxy and no analytical rule is duplicated in the client.

The journey is `IDLE -> FILE_SELECTED -> SUBMITTING -> SUCCESS | ERROR`. Results and errors are ephemeral React state. Refreshing or choosing **Analyze another dataset** returns to upload; local storage, session storage, accounts and history are not used.

## Upload and demo

The upload surface supports drag-and-drop and native file selection. Client preflight checks a non-empty `.csv` or `.xlsx` filename and the 5 MiB file limit; FastAPI remains authoritative for format and content. The frontend does not parse datasets or inspect XLSX sheets, so sheet selection is not exposed.

**Try the sample dataset** fetches the bundled Customer Operations Sample, creates a browser `File` and sends it through the same `analyzeDataset` client and backend pipeline as a normal upload. No response fixture, score or classification is hardcoded. Successful demo results are explicitly labelled **Synthetic sample dataset**. See [SYNTHETIC_DEMO.md](SYNTHETIC_DEMO.md).

## Result information architecture

The single results page provides compact navigation to:

1. **Overview**: source metadata, dimensions and review counts.
2. **Quality**: exact overall structural score, observed completeness, applicability and Quality findings.
3. **Governance**: count-based summary, classifications and a native disclosure containing all canonical governance findings/evidence.
4. **Recommendations**: canonical actions grouped only for presentation, with every original id and source relationship retained.
5. **Column inventory**: ordered structural columns with search, classification filter and secondary aggregate details.

Quality and Governance remain separate. Observed dataset completeness is not presented as scored structural completeness. Governance is presented as automated signals requiring human review, never as a compliance or legal score.

## Evidence and traceability

`DETECTED`, `INFERRED` and `SUGGESTED` are shown as distinct semantics. Findings expose readable title, affected field, severity/assertion/confidence and contextual evidence. Technical ids, rule versions and aggregate details remain available through native disclosures.

Recommendation source links resolve exact stable finding anchors. Governance findings are collapsed by default to reduce density, but their exact count and all canonical objects remain reachable. The frontend formats or groups existing response values but does not mutate the response, invent findings or change counts.

The Column inventory joins `analysis.governance.classifications` to `analysis.profiling.columns` by canonical `column_id`. It does not use `ColumnProfile.classifications` as governance storage. Raw rows, samples, raw category values and duplicate row positions are never rendered.

## Navigation, responsive behavior and accessibility

Result navigation is sticky and horizontally scrollable at narrow widths, with `aria-current="location"` tracking the visible section. Anchors account for the sticky offset. The column table has a labelled focusable scroll region, caption and header scopes.

The interface uses semantic headings and landmarks, native buttons/disclosures, visible focus, status and alert announcements, a keyboard skip link, reduced-motion support and non-colour-only labels. Success focuses the result heading and request failures focus the recoverable alert. The implementation targets practical WCAG 2.2 AA principles without claiming certification.

## Errors and trust boundaries

Known API codes map to short safe messages; unknown errors use a generic fallback. Tracebacks, library text, raw API details, internal paths and file contents are not rendered. Filename, sheet name, column names and response text are treated as untrusted escaped data; the UI uses no `dangerouslySetInnerHTML` or `eval`.

The page states that files are processed for the request, V0.1 does not persist datasets, raw rows are not returned and automated classifications require human review. It does not claim browser-only processing, encryption, legal compliance or AI analysis.

## Validation

Vitest covers upload preflight, state transitions, API/network errors, result semantics, evidence, traceability, filtering, demo behavior, navigation and accessibility contracts. Playwright adds five Chromium critical-path tests against a real FastAPI process and a production-built Next.js server: landing, synthetic demo and traceability, invalid file, real network outage and normal CSV upload.

The release commands and validated toolchain are documented in [RELEASE.md](RELEASE.md).

## V0.1 non-goals

There is no export/download control, XLSX sheet selector, second route, sidebar, chart dependency, authentication, persistence, workspace, chat or AI UI. Optional AI and major product capabilities remain deferred.
