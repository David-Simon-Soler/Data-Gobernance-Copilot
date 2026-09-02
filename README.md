# Data Governance Copilot

**Status: Phase 1.1 — Ingestion hardened**

Data Governance Copilot es una aplicación local para perfilar CSV/XLSX y presentar calidad, riesgos potenciales de gobernanza, evidencia y acciones priorizadas. No es un comprobador de cumplimiento legal ni sustituye a un Data Steward o revisión jurídica.

## Principios

El núcleo es **evidence-first**: profiling determinista, reglas explícitas, evidencia trazable y scoring reproducible. Toda salida conserva su nivel: `DETECTED` para hechos calculados, `INFERRED` para inferencias con señales/confidence y `SUGGESTED` para acciones o propuestas. La IA futura es opcional y solo advisory; no altera hechos ni métricas.

## Estado implementado

Phase 1.1 implementa exclusivamente ingestión segura y normalización de CSV/XLSX: validación de formatos y límites, CSV UTF-8 con delimitadores controlados, XLSX read-only sin evaluación de fórmulas, `IngestedDataset` interno con Polars y `GET /health`. No implementa profiling, quality score, governance, recomendaciones ni IA.

```text
Browser (future) → FastAPI → Ingestion → IngestedDataset → future profiling
```

El procesamiento es stateless, local y no persiste datasets por defecto.

## V0.1 previsto y non-goals

El producto futuro cubrirá CSV/XLSX, schema, nulos, cardinalidad, estadísticas, duplicados, tipos, cuatro dimensiones de calidad, clasificación semántica prudente, evidence, recommendations y data dictionary draft.

Fuera de V0.1: cuentas, DB, persistencia, conectores, lineage, data contracts, historical drift, RBAC, legal compliance scoring o certificación GDPR, PDF/OCR, embeddings/vector DB, agentes, chat, BI y ETL.

Claims permitidos: “automated data profiling”, “data quality heuristic”, “potential personal data” y “suggested data dictionary”. No se afirma GDPR compliance, auditoría oficial ni garantía de calidad.

## Stack y documentación

Python, FastAPI, Pydantic, Polars, openpyxl y pytest; frontend futuro con Next.js, TypeScript y Tailwind CSS.

- [Producto](docs/PRODUCT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Dominio](docs/DOMAIN.md)
- [Modelo de calidad](docs/QUALITY_MODEL.md)
- [Gobernanza](docs/GOVERNANCE.md)
- [Ingestión](docs/INGESTION.md)
- [Privacidad y seguridad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)
