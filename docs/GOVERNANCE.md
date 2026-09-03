# Gobernanza

## Taxonomía y límites

Tags combinables: `IDENTIFIER`, `QUASI_IDENTIFIER`, `CONTACT_INFORMATION`, `GEOGRAPHIC_INFORMATION`, `DEMOGRAPHIC_INFORMATION`, `FINANCIAL_INFORMATION`, `TEMPORAL_FIELD`, `FREE_TEXT`, `BUSINESS_METRIC`, `CATEGORICAL_DIMENSION`, `POTENTIAL_PERSONAL_DATA`.

`POTENTIAL_PERSONAL_DATA` expresa riesgo potencial, no una determinación legal de PII/datos personales. `QUASI_IDENTIFIER` siempre expresa una clasificación potencial e `INFERRED`, nunca un hecho confirmado de reidentificación. V0.1 no deduce identidad, base legal, certificación GDPR ni ausencia de riesgo.

## Señales canónicas

Cada señal canónica tiene `source`, `strength`, `deterministic: true`, `evidence_reference`, `rule_id` y `rule_version`. Fuentes: `COLUMN_NAME`, `VALUE_PATTERN`, `PRIMITIVE_TYPE`, `UNIQUENESS`, `VALUE_DISTRIBUTION`. `AI_SEMANTIC_SUGGESTION` usa `deterministic: false` y se mantiene fuera de confidence canónica.

Para señales deterministas: pattern o contenido fuerte vale 3; nombre 2; tipo, unicidad o distribución compatible 1; contradicción explícita −1, mínimo 0. Las fuentes se cuentan una vez por categoría; pattern y content son una señal fuerte cada una solo cuando reglas distintas lo acreditan. `HIGH`: 5+ y al menos una señal fuerte; `MEDIUM`: 3–4; `LOW`: 1–2. El nombre aislado no alcanza HIGH. Regex/umbrales/listas de nombres se versionan y la evidence conserva ratios y muestras redactadas.

Una clasificación canónica es `INFERRED` y depende exclusivamente de dichas señales deterministas. Una clasificación procedente solo de LLM es `SUGGESTED`, advisory-only y no entra en `ColumnProfile.classifications`, confidence canónica ni governance findings canónicos de V0.1.

## Operational Governance Rules — Model 0.1

Estas reglas son política explícita de producto V0.1, no una definición universal de gobernanza, PII ni obligaciones legales. La salida sigue el orden de la taxonomía anterior; las categorías no son excluyentes.

### Normalización y evidencia

El nombre Unicode se separa en límites camelCase/PascalCase y en `_`, `-` o whitespace; después se aplica `casefold` y se eliminan tokens vacíos. `CustomerEmail`, `customer_email`, `customer-email` y `customer email` producen `customer`, `email`. No hay substring matching, stemming, fuzzy matching ni edit distance.

Cada evidence puede incluir id/posición de columna, tokens normalizados, tipo primitivo, counts estructurales, cardinality ratio, flag de candidate identifier, categorías contribuyentes, regla/versión y fuerza. Nunca contiene valores de celdas, muestras, filas completas, emails, teléfonos ni direcciones.

| Rule | Condición y señales | Categoría / confidence |
|---|---|---|
| `GOV-ID-001` | nombre exacto `id`, `identifier`, `uuid`, `guid` o terminal `id`; y `STRUCTURAL_CANDIDATE_IDENTIFIER`. `COLUMN_NAME` 2 + `UNIQUENESS` 1. `code` solo se excluye. | `IDENTIFIER`, `INFERRED`, MEDIUM |
| `GOV-TEMP-001` | primitive `DATE`/`DATETIME`. `PRIMITIVE_TYPE` 1. Nombres temporales aprobados: `date`, `datetime`, `timestamp`, `time`, `created_at`, `updated_at` pueden aportar `COLUMN_NAME` 2. | `TEMPORAL_FIELD`, LOW o MEDIUM |
| `GOV-CONTACT-001` | terminal `email`, `phone`, `telephone`, `mobile`. Excluir si coexiste con `campaign`, `sent`, `count` o `call`. | `CONTACT_INFORMATION`, LOW |
| `GOV-GEO-001` | terminal `country`, `country_code`, `city`, `postal_code`, `postcode`, `zip_code`, `latitude`, `longitude`. | `GEOGRAPHIC_INFORMATION`, LOW |
| `GOV-GEO-002` | `region`, `state`, `province` exactos y aislados. Excluir `application_state`, `order_state`, `workflow_state`, `sales_region`, `business_region`. | `GEOGRAPHIC_INFORMATION`, LOW |
| `GOV-DEMO-001` | nombre `age`, `birth_date`, `date_of_birth`, `dob`, `gender`; tipo temporal aporta 1 para las fechas. | `DEMOGRAPHIC_INFORMATION`, LOW o MEDIUM |
| `GOV-FIN-001` | nombre `revenue`, `amount`, `price`, `cost`, `salary` y primitive `INTEGER`/`FLOAT`. | `FINANCIAL_INFORMATION`, MEDIUM |
| `GOV-METRIC-001` | nombre `revenue`, `amount`, `price`, `cost`, `quantity`, `count`, `score` y primitive `INTEGER`/`FLOAT`; se permiten terminales estructurados como `order_count`. | `BUSINESS_METRIC`, MEDIUM |
| `GOV-TEXT-001` | nombre `description`, `comment`, `comments`, `notes`, `note`, `free_text` y primitive `STRING`. | `FREE_TEXT`, MEDIUM |
| `GOV-CAT-001` | `R>=20`, non-null `>=10`, distinct `>=2`, cardinality ratio `<=0.20`, primitive `STRING`/`BOOLEAN`, y sin `IDENTIFIER`, `FREE_TEXT` ni `BUSINESS_METRIC`. `PRIMITIVE_TYPE` 1 + `VALUE_DISTRIBUTION` 1. | `CATEGORICAL_DIMENSION`, LOW |

`VALUE_PATTERN` permanece como fuente canónica reservada: V0.1 no usa raw-value pattern matching ni regex de email/teléfono porque DatasetProfile no conserva contenido ni existen señales agregadas aprobadas.

### Potential personal data y quasi-identifiers

`GOV-PERSONAL-001` emite `POTENTIAL_PERSONAL_DATA`, `INFERRED`, para una columna ya clasificada como `CONTACT_INFORMATION`, `IDENTIFIER` o `DEMOGRAPHIC_INFORMATION`; reutiliza sus señales/evidence y recalcula confidence con los pesos canónicos. No se infiere automáticamente desde geografía, finanzas, temporal, free text, business metric ni categorical dimension.

`GOV-QUASI-001` emite `QUASI_IDENTIFIER`, `INFERRED`, para cada columna participante solo cuando el mismo dataset contiene al menos dos columnas distintas clasificadas entre `DEMOGRAPHIC_INFORMATION` y `GEOGRAPHIC_INFORMATION`, y ninguna es `IDENTIFIER` ni `CONTACT_INFORMATION`. La evidence referencia únicamente ids/categorías contribuyentes. Nunca afirma riesgo real de reidentificación.

Los findings usan lenguaje cauteloso: “inferred contact information from column-name signals” o “signals consistent with potential personal data”. Nunca afirman que una columna contiene datos personales, PII, una violación GDPR u obligación legal.

## Quasi-identifiers y recomendaciones

V0.1 no confirma quasi-identifiers desde una única columna aislada. Solo puede emitir `QUASI_IDENTIFIER`, `INFERRED`, cuando existan señales explícitas deterministas y con lenguaje condicional. No infiere capacidad de reidentificación combinando columnas.

Severity mide impacto y confidence certeza: `INFO`, `WARNING`, `HIGH`, `CRITICAL` frente a `LOW`, `MEDIUM`, `HIGH`. Toda recomendación es `SUGGESTED` y referencia un finding.

## IA

**LLM output is advisory only.** Puede sugerir significado, descripción, explicación o wording de recomendaciones. Nunca crea/muta Evidence, `DETECTED` findings, quality metrics, quality scores ni governance classifications canónicas; tampoco contribuye a confidence V0.1.
