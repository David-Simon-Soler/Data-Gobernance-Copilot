# Data Governance Copilot

**Status: Phase 9 complete — release preparation in progress**

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
- [Demo sintética](docs/SYNTHETIC_DEMO.md) — dataset y experiencia reproducible
- [Release y ejecución local](docs/RELEASE.md) — instalación limpia, validación y troubleshooting
- [Privacidad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)

## Quick Start desde un clon limpio

Requisitos comprobados: Git, Python 3.11 o superior y Node.js con npm. Esta receta se validó desde el estado comprometido con Python 3.12.14 y 3.13.15, Node.js 24.19.0 y npm 11.17.0. Python 3.11 y Node.js 22 LTS no estaban disponibles en el entorno de validación y no se afirman como probados.

### Backend

```sh
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
export DATA_GOV_CORS_ORIGINS=http://localhost:3000
python -m pytest
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

En otra terminal, `curl http://127.0.0.1:8000/health` debe devolver exactamente `{"status":"ok"}`.

### Frontend

```sh
cd apps/web
npm ci
npm run lint
npm test
npm run typecheck
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

Para comprobar el build de producción en lugar del servidor de desarrollo:

```sh
npm run start
```

Abre `http://localhost:3000`. `NEXT_PUBLIC_API_BASE_URL` es una variable pública de build y debe estar definida al ejecutar `npm run build` (o `npm run dev`); no contiene secretos. El frontend no incorpora proxy API: el navegador comunica directamente con FastAPI mediante la URL configurada.

`localhost` y `127.0.0.1` son orígenes distintos para el navegador. La receta canónica sirve el frontend en `http://localhost:3000`, permite ese origen mediante `DATA_GOV_CORS_ORIGINS` y dirige sus peticiones a `http://127.0.0.1:8000`. Consulta [RELEASE.md](docs/RELEASE.md) para la prueba de producción, la demo y el diagnóstico de CORS.
