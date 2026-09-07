# Roadmap

## Completed product phases

- **Phase 0 - Product and architecture:** evidence-first model, governance boundaries, privacy model and V0.1 scope.
- **Phase 1 - Ingestion:** secure CSV/XLSX normalization, resource limits and error contracts.
- **Phase 2 - Profiling:** deterministic structure, types, missingness, cardinality, duplicates, candidate identifiers and evidence.
- **Phase 3 - Quality Engine:** Quality Model V0.1, applicability, observed/structural completeness, uniqueness, validity and consistency.
- **Phase 4 - Governance Engine:** versioned taxonomy and deterministic classifications with confidence, false-positive controls and human-review language.
- **Phase 5 - Recommendation Engine:** deterministic `P0/P1/P2` actions traced to existing findings and evidence.
- **Phase 6 - Optional AI:** deliberately deferred; V0.1 contains no AI implementation.
- **Phase 7 - Analysis API:** synchronous typed FastAPI orchestration, safe errors, CORS and request limits.
- **Phase 8 - Frontend:** single-route Next.js experience, upload, results, traceability, inventory and dependency hardening.
- **Phase 9 - Demo and polish:** final information architecture, responsive/accessibility work, synthetic demo and visual QA.

## Release preparation

- **Phase 10.0 - Release contract and QA plan:** complete.
- **Phase 10.1 - Reproducibility and local run:** complete.
- **Phase 10.2 - Critical-path E2E and smoke:** complete; five Chromium tests use a real FastAPI backend and production Next.js.
- **Phase 10.3 - Public README and documentation closure:** complete and validated.
- **Phase 10.4 - Security and repository audit:** next.
- **Phase 10.5 - Release decision:** pending.

## Deferred beyond V0.1

Optional advisory AI, accounts, authentication, persistence, history, databases, connectors, lineage, configurable rules, background jobs, collaboration, exports and public deployment infrastructure require separate contracts and are not implied by V0.1.
