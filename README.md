# Data Governance Copilot

**Deterministic, evidence-first dataset assessment for CSV and XLSX files.**

Data Governance Copilot helps analysts and governance practitioners understand a dataset before using it. It profiles structure, calculates a reproducible quality assessment, surfaces governance-oriented classifications and links each recommendation back to the finding and evidence that produced it.

V0.1 is a stateless, local-first application composed of a Next.js frontend and a FastAPI backend. It does not require AI, an account or a database.

## What it provides

- Secure ingestion of one CSV or XLSX file with explicit resource limits.
- Deterministic profiling of types, missingness, uniqueness, duplicates, cardinality and aggregate statistics.
- Structural quality analysis across completeness, uniqueness, validity and consistency, with applicability made explicit.
- Governance-oriented classifications such as contact, geographic or financial information and **potential personal data**.
- Evidence-backed findings and prioritized, traceable recommendations.
- A synthetic demo that follows the same real API and analysis path as an uploaded file.

## Evidence first

The product separates what the system knows from what still requires judgment:

- `DETECTED`: a deterministic or calculated fact.
- `INFERRED`: a statistical or semantic classification with uncertainty and signals that require review.
- `SUGGESTED`: a proposed action linked to an existing finding.

Evidence is attached to findings, and recommendations trace back to those findings. AI is not used in V0.1. Any optional future AI layer remains advisory and cannot silently replace deterministic facts, metrics, scores, evidence or canonical classifications.

## Try the synthetic demo

The bundled **Customer Operations Sample** is a synthetic XLSX with 50 rows and 13 columns. The validated V0.1 result is:

- overall structural quality: **99/100**;
- observed dataset completeness: **approximately 98.46%**;
- **2** Quality findings;
- **19** Governance classifications and **19** Governance findings;
- **8** recommendations.

The example illustrates an important boundary: high aggregate structural quality does not mean that nothing requires review, and it does not establish that a dataset is safe or compliant. See the [synthetic demo specification](docs/SYNTHETIC_DEMO.md).

## Architecture

```text
Browser -> Next.js -> direct HTTP -> FastAPI -> Ingestion -> Profiling
                                                |-> Quality
                                                |-> Governance
                                            -> Recommendations
                                            -> typed response
```

Analysis is synchronous and the domain pipeline runs in bounded memory. The browser calls FastAPI directly; there is no Next.js API proxy, database, persistence, authentication or background queue. The HTTP multipart framework may spool upload data to an OS-managed temporary file before the domain pipeline receives it; that temporary lifecycle is framework-managed, not application persistence. The backend remains the source of truth for every analytical rule. See [Architecture](docs/ARCHITECTURE.md) and the [API contract](docs/API.md).

## Quick start

Requirements: Git, Python `>=3.11`, Node.js and npm. The release recipe has been validated with Python 3.12.14 and 3.13.15, Node.js 24.19.0 and npm 11.17.0; this does not claim that Python 3.11 or Node.js 22 were tested.

Backend:

```sh
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
export DATA_GOV_CORS_ORIGINS=http://localhost:3000
python -m pytest
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend, in another terminal:

```sh
cd apps/web
npm ci
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build
npm run start
```

Open `http://localhost:3000`. The frontend URL and configured CORS origin must match exactly. No secret is required. See [Release and local execution](docs/RELEASE.md) for clean installation, development and troubleshooting.

## Validation

```sh
# Backend
cd apps/api && source .venv/bin/activate && python -m pytest

# Frontend
cd apps/web && npm run lint && npm test && npm run typecheck

# Real FastAPI + production Next.js smoke
cd apps/web && npx playwright install chromium && npm run test:e2e
```

The E2E suite uses one Chromium worker, a real FastAPI process and a production-built Next.js server. `DGC_E2E_PYTHON` can select another prepared backend Python executable.

## Inputs and limits

V0.1 accepts `.csv` and `.xlsx` (case-insensitive). Legacy `.xls`, macro-enabled `.xlsm` and other formats are rejected.

| Limit | Value |
|---|---:|
| File | 5 MiB |
| HTTP multipart body | 6 MiB |
| Rows | 100,000 |
| Columns | 250 |
| XLSX sheets | 20 |
| Cells | 1,000,000 |
| ZIP entries | 2,000 |
| Uncompressed XLSX content | 20 MiB |

See [Ingestion](docs/INGESTION.md) for format behavior and validation boundaries.

## Models and interpretation

The [Quality Model V0.1](docs/QUALITY_MODEL.md) distinguishes observed dataset completeness from scored structural completeness. Scores use only applicable dimensions and are structural heuristics, not guarantees of business correctness or fitness for use.

The [Governance Model V0.1](docs/GOVERNANCE.md) uses explicit, versioned deterministic signals. Its classifications are automated signals requiring human review, not legal determinations. Recommendations use only `P0`, `P1` and `P2` and remain `SUGGESTED` actions.

## Privacy and security

V0.1 processes each request without persistence by default and does not return raw rows. Filenames and workbook contents are treated as untrusted input; formulas are not executed, external workbook links are disabled and resource limits are enforced.

These local safeguards do not make an unrestricted public deployment safe by themselves. Internet-facing operation still requires deployment controls such as rate limiting, concurrency and resource isolation, hosting timeouts, abuse prevention, monitoring and a deployment-specific CORS allowlist. See [Privacy and security](docs/PRIVACY.md).

## Limitations and non-goals

V0.1 is not a GDPR checker, compliance assessment, legal opinion, certification, data-quality guarantee or proof that a dataset is safe. It does not provide accounts, authentication, persistence, history, databases, connectors, lineage, data contracts, RBAC, background jobs, report export, BI/ETL, chat or AI-generated analysis.

The application is local-first and self-hostable; uploaded data is sent from the browser to the configured FastAPI service for processing, so it is not processed entirely in the browser.

## Project status

Phases 0-9 and release preparation through Phase 10.4 are complete. Phase 10.5 visual refinement is in final validation. Major product features remain deferred. See the [Roadmap](docs/ROADMAP.md).

## Documentation

- [Product scope and positioning](docs/PRODUCT.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Domain contracts](docs/DOMAIN.md)
- [Quality Model V0.1](docs/QUALITY_MODEL.md)
- [Governance Model V0.1](docs/GOVERNANCE.md)
- [Privacy and security](docs/PRIVACY.md)
- [Frontend and UX](docs/FRONTEND.md)
- [Synthetic demo](docs/SYNTHETIC_DEMO.md)
- [Release and local execution](docs/RELEASE.md)
- [Roadmap](docs/ROADMAP.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Analysis API](docs/API.md), [Ingestion](docs/INGESTION.md), [Profiling](docs/PROFILING.md), [Quality Engine](docs/QUALITY_ENGINE.md), [Governance Engine](docs/GOVERNANCE_ENGINE.md) and [Recommendations](docs/RECOMMENDATIONS.md)

## License

Data Governance Copilot is licensed under the [MIT License](LICENSE).
