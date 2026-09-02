# Roadmap

1. **Phase 0 — Product & Architecture**: documentación y decisiones; sin código.
2. **Phase 1 — Ingestion**: validación CSV/XLSX, límites, lifecycle temporal, contratos de error.
3. **Phase 2 — Profiling**: perfiles, tipos, nulos, cardinalidad, stats, duplicados, identificadores, outliers y malformados.
4. **Phase 3 — Quality Engine**: scoring especificado, evidencia, tests deterministas.
5. **Phase 4 — Governance Engine**: clasificación, posibles datos personales, señales y confianza.
6. **Phase 5 — Recommendation Engine**: acciones trazables y prioridades.
7. **Phase 6 — Optional AI**: `LLMProvider`, modo none, minimización y evaluación.
8. **Phase 7 — API**: FastAPI, contratos, errores y límites.
9. **Phase 8 — Frontend**: carga, overview, evidencia, findings, diccionario y privacidad.
10. **Phase 9 — Demo & Polish**: accesibilidad, docs y demo con datos ficticios.
11. **Phase 10 — QA & Public Release**: pytest, Vitest, Playwright, seguridad de archivos y claims.

Fixtures futuros y ficticios: `clean_customers`, `dirty_customers`, `duplicate_ids`, `missing_values`, `mixed_types`, `potential_personal_data`, `high_cardinality`, `constant_columns`, `outliers`, `malformed_dates`, `empty_dataset`, `wide_dataset`, `spreadsheet_edge_cases`.
