# Data Governance Copilot

**Status: Phase 2 — Dataset Profiling implemented**

Data Governance Copilot es una aplicación local para perfilar CSV/XLSX y presentar calidad, riesgos potenciales de gobernanza, evidencia y acciones priorizadas. No es un comprobador de cumplimiento legal ni sustituye a un Data Steward o revisión jurídica.

## Principios

El núcleo es **evidence-first**: profiling determinista, reglas explícitas, evidencia trazable y scoring reproducible. `DETECTED` identifica hechos calculados, `INFERRED` inferencias con señales/confidence y `SUGGESTED` propuestas. La IA futura es advisory-only y no altera hechos ni métricas.

## Estado implementado

CSV/XLSX seguro y stateless, normalización `IngestedDataset`, `GET /health` y profiling determinista de estructura: nulls, distinct/uniqueness, duplicados, primitive types, estadísticas, columnas constant/all-null y structural candidate identifiers. No hay quality score, governance, personal-data detection, recomendaciones ni IA.

## V0.1 y non-goals

El producto futuro cubrirá cuatro dimensiones de calidad, clasificación semántica prudente, evidence, recommendations y data dictionary draft. Fuera: cuentas, DB, persistencia, conectores, lineage, data contracts, historical drift, RBAC, legal compliance scoring/certificación GDPR, PDF/OCR, embeddings/vector DB, agentes, chat, BI y ETL.

Claims permitidos: “automated data profiling”, “data quality heuristic”, “potential personal data” y “suggested data dictionary”. No se afirma GDPR compliance, auditoría oficial ni garantía de calidad.

## Documentación

- [Producto](docs/PRODUCT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Dominio](docs/DOMAIN.md)
- [Ingestión](docs/INGESTION.md)
- [Profiling](docs/PROFILING.md)
- [Modelo de calidad](docs/QUALITY_MODEL.md)
- [Gobernanza](docs/GOVERNANCE.md)
- [Privacidad](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)
