# Data Governance Copilot

**Status: Phase 7.1 — Analysis API implemented and validated**

Data Governance Copilot es una aplicación local para perfilar CSV/XLSX y presentar calidad, riesgos potenciales de gobernanza, evidencia y acciones priorizadas. No es un comprobador de cumplimiento legal ni sustituye a un Data Steward o revisión jurídica.

## Principios

El núcleo es **evidence-first**: profiling determinista, reglas explícitas, evidencia trazable y scoring reproducible. `DETECTED` identifica hechos calculados, `INFERRED` inferencias con señales/confidence y `SUGGESTED` propuestas. La IA futura es advisory-only y no altera hechos ni métricas.

## Estado implementado

CSV/XLSX seguro y stateless, normalización `IngestedDataset`, `GET /health`, profiling determinista y Quality Engine V0.1. El motor calcula completeness estructural, uniqueness, validity y consistency solo cuando aplican, y expone observed completeness sin penalizar automáticamente columnas normales con nulls. Governance Engine y Recommendation Engine deterministas implementados; no hay IA ni API de recomendaciones.

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
- [Privacidad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)
