# Decisiones de arquitectura

| ID | Decisión | Motivo | Consecuencia |
|---|---|---|
| ADR-001 | Polars sobre Pandas | Profiling tabular eficiente y expresivo. | Aislarlo en motor de profiling. |
| ADR-002 | Sin persistencia V0.1 | Menos coste, alcance y exposición. | Sin historial, cuentas ni reanálisis guardado. |
| ADR-003 | Findings evidence-first | Cada conclusión debe revisarse. | Finding requiere método y evidencia. |
| ADR-004 | Scoring determinista | Debe ser reproducible/defendible. | IA no calcula ni agrega métricas. |
| ADR-005 | IA no crea hechos detectados | Evita fabricación y confusión de niveles. | Solo inferencias/sugerencias etiquetadas. |
| ADR-006 | Monolito modular stateless | V0.1 no justifica microservicios, cola o DB. | Límites internos claros y ejecución local simple. |
| ADR-007 | CSV/XLSX solamente | Alcance útil con menor superficie de ataque. | Rechazo PDF, OCR, conectores y `.xlsm`. |
| ADR-008 | Reglas semánticas de Governance explícitas y versionadas | La taxonomía sola no determina mappings seguros. | Vocabularios, exclusiones y umbrales V0.1 son política de producto reproducible, no hechos legales universales. |
