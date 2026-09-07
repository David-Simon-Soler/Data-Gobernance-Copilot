# Gobernanza

## Taxonomía y límites

Tags combinables: `IDENTIFIER`, `QUASI_IDENTIFIER`, `CONTACT_INFORMATION`, `GEOGRAPHIC_INFORMATION`, `DEMOGRAPHIC_INFORMATION`, `FINANCIAL_INFORMATION`, `TEMPORAL_FIELD`, `FREE_TEXT`, `BUSINESS_METRIC`, `CATEGORICAL_DIMENSION`, `POTENTIAL_PERSONAL_DATA`.

`POTENTIAL_PERSONAL_DATA` expresa riesgo potencial, no una determinación legal de PII/datos personales. `QUASI_IDENTIFIER` siempre expresa una clasificación potencial e `INFERRED`, nunca un hecho confirmado de reidentificación. V0.1 no deduce identidad, base legal, certificación GDPR ni ausencia de riesgo.

## Señales canónicas

Cada `GovernanceSignal` implementada tiene `source`, `strength`, `deterministic: true`, `evidence_id`, `rule_id` y `rule_version`. El enum V0.1 contiene `COLUMN_NAME`, `VALUE_PATTERN`, `PRIMITIVE_TYPE`, `UNIQUENESS` y `VALUE_DISTRIBUTION`; `VALUE_PATTERN` está reservada pero ninguna regla activa la usa. No existe una source de IA en el modelo runtime.

Las reglas activas asignan fuerza 2 a una señal de nombre aprobada y fuerza 1 a tipo, unicidad, distribución o categoría contribuyente. Confidence se calcula como `MEDIUM` con suma 3-4 y `LOW` con suma 1-2; la rama `HIGH` requiere suma 5+ y una señal de fuerza 3, condición que ninguna regla activa V0.1 produce. Las fuentes y reglas están versionadas.

Una clasificación canónica es `INFERRED` y depende exclusivamente de dichas señales deterministas. Se almacena en `GovernanceAssessment.classifications` y no se escribe de vuelta en `DatasetProfile` ni `ColumnProfile`. Una clasificación procedente solo de LLM sería `SUGGESTED`, advisory-only y no entraría en la confidence ni en los governance findings canónicos de V0.1.

## Operational Governance Rules — Model 0.1

Estas reglas son política explícita de producto V0.1, no una definición universal de gobernanza, PII ni obligaciones legales. La salida sigue el orden de la taxonomía anterior; las categorías no son excluyentes.

### Normalización y evidencia

El nombre Unicode se separa en límites camelCase/PascalCase y en `_`, `-` o whitespace; después se aplica `casefold` y se eliminan tokens vacíos. `CustomerEmail`, `customer_email`, `customer-email` y `customer email` producen `customer`, `email`. No hay substring matching, stemming, fuzzy matching ni edit distance.

Cada evidence implementada conserva subject/column id, posición, tokens normalizados, tipo primitivo, flag de candidate identifier, fuerza, rule id y version. Nunca contiene valores de celdas, muestras, filas completas, emails, teléfonos ni direcciones.

| Rule | Condición y señales | Categoría / confidence |
|---|---|---|
| `GOV-ID-001` | nombre exacto `id`, `identifier`, `uuid`, `guid` o terminal `id`; y `STRUCTURAL_CANDIDATE_IDENTIFIER`. `COLUMN_NAME` 2 + `UNIQUENESS` 1. `code` solo se excluye. | `IDENTIFIER`, `INFERRED`, MEDIUM |
| `GOV-TEMP-001` | primitive `DATE`/`DATETIME`. `PRIMITIVE_TYPE` 1. Nombres temporales aprobados: `date`, `datetime`, `timestamp`, `time`, `created_at`, `updated_at` pueden aportar `COLUMN_NAME` 2. | `TEMPORAL_FIELD`, LOW o MEDIUM |
| `GOV-CONTACT-001` | terminal `email`, `phone`, `telephone`, `mobile`. Excluir si coexiste con `campaign`, `sent`, `count` o `call`. | `CONTACT_INFORMATION`, LOW |
| `GOV-GEO-001` | terminal `country`, `country_code`, `city`, `postal_code`, `postcode`, `zip_code`, `latitude`, `longitude`; también `region`, `state` o `province` exactos. Excluir `application_state`, `order_state`, `workflow_state`, `sales_region`, `business_region`. | `GEOGRAPHIC_INFORMATION`, LOW |
| `GOV-DEMO-001` | nombre `age`, `birth_date`, `date_of_birth`, `dob`, `gender`; tipo temporal aporta 1 para las fechas. | `DEMOGRAPHIC_INFORMATION`, LOW o MEDIUM |
| `GOV-FIN-001` | nombre `revenue`, `amount`, `price`, `cost`, `salary` y primitive `INTEGER`/`FLOAT`. | `FINANCIAL_INFORMATION`, MEDIUM |
| `GOV-METRIC-001` | nombre `revenue`, `amount`, `price`, `cost`, `quantity`, `count`, `score` y primitive `INTEGER`/`FLOAT`; se permiten terminales estructurados como `order_count`. | `BUSINESS_METRIC`, MEDIUM |
| `GOV-TEXT-001` | nombre `description`, `comment`, `comments`, `notes`, `note`, `free_text` y primitive `STRING`. | `FREE_TEXT`, MEDIUM |
| `GOV-CAT-001` | `R>=20`, non-null `>=10`, distinct `>=2`, cardinality ratio `<=0.20`, primitive `STRING`/`BOOLEAN`, y sin `IDENTIFIER`, `FREE_TEXT` ni `BUSINESS_METRIC`. `PRIMITIVE_TYPE` 1 + `VALUE_DISTRIBUTION` 1. | `CATEGORICAL_DIMENSION`, LOW |

`VALUE_PATTERN` permanece como fuente canónica reservada: V0.1 no usa raw-value pattern matching ni regex de email/teléfono porque DatasetProfile no conserva contenido ni existen señales agregadas aprobadas.

### Potential personal data y quasi-identifiers

`GOV-PERSONAL-001` emite `POTENTIAL_PERSONAL_DATA`, `INFERRED`, para una columna ya clasificada como `CONTACT_INFORMATION`, `IDENTIFIER` o `DEMOGRAPHIC_INFORMATION`. Crea una señal determinista `contributing_category` de fuerza 1 y confidence LOW con su propia evidence estructural. No se infiere automáticamente desde geografía, finanzas, temporal, free text, business metric ni categorical dimension.

`GOV-QUASI-001` emite `QUASI_IDENTIFIER`, `INFERRED`, para cada columna participante cuando el dataset contiene al menos dos columnas distintas clasificadas como `DEMOGRAPHIC_INFORMATION` o `GEOGRAPHIC_INFORMATION`, salvo una participante que también sea `IDENTIFIER` o `CONTACT_INFORMATION`. Cada salida usa una señal determinista `contributing_category` de fuerza 1, confidence LOW y evidence estructural; nunca afirma riesgo real de reidentificación.

Los findings usan títulos `Inferred ...` y explican que la columna coincidió con deterministic governance signals y que el resultado no es una determinación legal o de compliance. Nunca afirman que una columna contiene datos personales, PII, una violación GDPR u obligación legal.

## Quasi-identifiers y recomendaciones

V0.1 no confirma quasi-identifiers desde una única columna aislada. Solo puede emitir `QUASI_IDENTIFIER`, `INFERRED`, cuando existan señales explícitas deterministas y con lenguaje condicional. No infiere capacidad de reidentificación combinando columnas.

Severity mide impacto y confidence certeza: `INFO`, `WARNING`, `HIGH`, `CRITICAL` frente a `LOW`, `MEDIUM`, `HIGH`. Toda recomendación es `SUGGESTED` y referencia un finding.

## IA

**LLM output is advisory only.** Puede sugerir significado, descripción, explicación o wording de recomendaciones. Nunca crea/muta Evidence, `DETECTED` findings, quality metrics, quality scores ni governance classifications canónicas; tampoco contribuye a confidence V0.1.
