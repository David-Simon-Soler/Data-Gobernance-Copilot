# Roadmap

1. **Phase 0 — Product & Architecture**: completa.
2. **Phase 1 — Ingestion**: completa. Validación CSV/XLSX, límites, lifecycle sin temporales, contratos de error y tests.
3. **Phase 2 — Profiling**: completa. Perfil estructural, tipos conservadores, nulls, cardinalidad, estadísticas, duplicados, candidate identifiers y evidence determinista.
4. **Phase 3 — Quality Engine**: completa. QualityScore V0.1 determinista, aplicabilidad, pesos, completeness observada/estructural, uniqueness sin doble penalización, validity y consistency canónicas.
5. **Phase 4 — Governance Engine**: completa. Taxonomía canónica, reglas deterministas versionadas, clasificación semántica con evidence, agregación de confidence, potential personal data, potential quasi-identifier y controles de falsos positivos; sin IA ni scoring de compliance/legal.
6. **Phase 5 — Recommendation Engine**: completa. Recommendation Model 0.1 determinista y trazable a findings/evidence existentes.
7. **Phase 6 — Optional AI**: diferida. No existe implementación de IA en V0.1; cualquier salida futura será advisory-only.
8. **Phase 7 — Analysis API**: completa. Contrato HTTP V0.1, orquestación determinista, errores seguros, CORS y límites.
9. **Phase 8 — Frontend**: completa y validada; pendiente únicamente del commit final de Phase 8. Contrato en [FRONTEND.md](FRONTEND.md). Incluye carga, overview, evidencia, findings, recomendaciones, inventario de columnas, privacidad y validación de dependencias.
10. **Phase 9 — Demo & Polish**: siguiente. Accesibilidad adicional, polish visual, documentación de demo y datos ficticios.
11. **Phase 10 — QA & Public Release**: pendiente. Pruebas completas, seguridad de archivos y revisión final de claims.

Fixtures futuros y ficticios: `clean_customers`, `dirty_customers`, `duplicate_ids`, `missing_values`, `mixed_types`, `potential_personal_data`, `high_cardinality`, `constant_columns`, `outliers`, `malformed_dates`, `empty_dataset`, `wide_dataset`, `spreadsheet_edge_cases`.
