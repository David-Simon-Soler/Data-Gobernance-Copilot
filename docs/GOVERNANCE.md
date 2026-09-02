# Gobernanza

## Taxonomía y límites

Tags combinables: `IDENTIFIER`, `QUASI_IDENTIFIER`, `CONTACT_INFORMATION`, `GEOGRAPHIC_INFORMATION`, `DEMOGRAPHIC_INFORMATION`, `FINANCIAL_INFORMATION`, `TEMPORAL_FIELD`, `FREE_TEXT`, `BUSINESS_METRIC`, `CATEGORICAL_DIMENSION`, `POTENTIAL_PERSONAL_DATA`.

`POTENTIAL_PERSONAL_DATA` expresa riesgo potencial, no una determinación legal de PII/datos personales. V0.1 no deduce identidad, base legal, certificación GDPR ni ausencia de riesgo.

## Señales canónicas

Cada señal canónica tiene `source`, `strength`, `deterministic: true`, `evidence_reference`, `rule_id` y `rule_version`. Fuentes: `COLUMN_NAME`, `VALUE_PATTERN`, `PRIMITIVE_TYPE`, `UNIQUENESS`, `VALUE_DISTRIBUTION`. `AI_SEMANTIC_SUGGESTION` usa `deterministic: false` y se mantiene fuera de confidence canónica.

Para señales deterministas: pattern o contenido fuerte vale 3; nombre 2; tipo, unicidad o distribución compatible 1; contradicción explícita −1, mínimo 0. Las fuentes se cuentan una vez por categoría; pattern y content son una señal fuerte cada una solo cuando reglas distintas lo acreditan. `HIGH`: 5+ y al menos una señal fuerte; `MEDIUM`: 3–4; `LOW`: 1–2. El nombre aislado no alcanza HIGH. Regex/umbrales/listas de nombres se versionan y la evidence conserva ratios y muestras redactadas.

Una clasificación canónica es `INFERRED` y depende exclusivamente de dichas señales deterministas. Una clasificación procedente solo de LLM es `SUGGESTED`, advisory-only y no entra en `ColumnProfile.classifications`, confidence canónica ni governance findings canónicos de V0.1.

## Quasi-identifiers y recomendaciones

V0.1 no confirma quasi-identifiers desde una única columna aislada. Solo puede emitir `POTENTIAL_QUASI_IDENTIFIER`, `INFERRED`, cuando existan señales explícitas deterministas y con lenguaje condicional. No infiere capacidad de reidentificación combinando columnas.

Severity mide impacto y confidence certeza: `INFO`, `WARNING`, `HIGH`, `CRITICAL` frente a `LOW`, `MEDIUM`, `HIGH`. Por ejemplo, un patrón de contacto fuerte con señales contradictorias puede ser finding `HIGH` / `MEDIUM`. Toda recomendación es `SUGGESTED` y referencia un finding: P0 antes de uso afectado, P1 antes de producción/publicación, P2 mejora planificada, P3 observación.

## IA

**LLM output is advisory only.** Puede sugerir significado, descripción, explicación o wording de recomendaciones. Nunca crea/muta Evidence, `DETECTED` findings, quality metrics, quality scores ni governance classifications canónicas; tampoco contribuye a confidence V0.1.
