# Data Governance Copilot

**Status: Phase 8 — frontend implemented and validated; final Phase 8 commit pending**

Data Governance Copilot es una aplicación local para perfilar CSV/XLSX y presentar calidad, riesgos potenciales de gobernanza, evidencia y acciones priorizadas. No es un comprobador de cumplimiento legal ni sustituye a un Data Steward o revisión jurídica.

## Principios

El núcleo es **evidence-first**: profiling determinista, reglas explícitas, evidencia trazable y scoring reproducible. `DETECTED` identifica hechos calculados, `INFERRED` inferencias con señales/confidence y `SUGGESTED` propuestas. La IA futura es advisory-only y no altera hechos ni métricas.

## Estado implementado

CSV/XLSX seguro y stateless, normalización `IngestedDataset`, profiling determinista y Quality, Governance y Recommendation Engines V0.1. FastAPI expone `GET /health` y `POST /api/v1/analyze`; la respuesta de análisis incluye profiling, quality, governance y recommendations. El frontend Next.js implementa en la ruta `/` la carga, el estado de procesamiento y la presentación trazable de resultados. No hay IA, DB, autenticación ni persistencia.

## V0.1 y non-goals

El score es una evaluación estructural determinista; no certifica calidad, compliance, corrección de negocio ni requisitos legales. Fuera: cuentas, DB, persistencia, conectores, lineage, data contracts, historical drift, RBAC, legal compliance scoring/certificación GDPR, PDF/OCR, embeddings/vector DB, agentes, chat, BI y ETL.

Claims permitidos: “automated data profiling”, “data quality heuristic”, “potential personal data” y “suggested data dictionary”. No se afirma GDPR compliance, auditoría oficial ni garantía de calidad.

## Documentación

- [Producto](docs/PRODUCT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Dominio](docs/DOMAIN.md)
- [Ingestión](docs/INGESTION.md)
- [Profiling](docs/PROFILING.md)
- [Modelo de calidad](docs/QUALITY_MODEL.md)
- [Quality Engine](docs/QUALITY_ENGINE.md)
- [Gobernanza](docs/GOVERNANCE.md) — modelo y reglas canónicas
- [Governance Engine](docs/GOVERNANCE_ENGINE.md) — implementación determinista
- [Recommendations](docs/RECOMMENDATIONS.md) — Recommendation Model 0.1
- [Analysis API](docs/API.md) — contrato HTTP V0.1
- [Frontend & UX](docs/FRONTEND.md) — contrato e implementación V0.1
- [Privacidad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)

## Desarrollo local

### Backend

```sh
cd apps/api
source .venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend

```sh
cd apps/web
npm ci
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

El frontend no incorpora proxy API: el navegador comunica directamente con FastAPI mediante la URL configurada.
