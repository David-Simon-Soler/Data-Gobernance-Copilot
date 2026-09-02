# Dominio

## Reglas de propiedad

`DatasetProfile` es el agregado efímero de un análisis: metadata, `columns`, `quality`, findings y recommendations. `ColumnProfile.classifications` es la **fuente canónica** de clasificaciones. El dataset puede exponer una vista agregada para presentación, derivada de columnas; nunca mantiene una copia independiente y mutable.

## Enums y value objects

- `AssertionLevel`: `DETECTED`, `INFERRED`, `SUGGESTED`.
- `Severity`: `INFO`, `WARNING`, `HIGH`, `CRITICAL`.
- `Confidence`: `LOW`, `MEDIUM`, `HIGH` exclusivamente.
- `Applicability`: `APPLICABLE`, `NOT_APPLICABLE`, `INSUFFICIENT_DATA`.
- `Priority`: `P0`, `P1`, `P2`, `P3`.
- `PrimitiveType`: `BOOLEAN`, `INTEGER`, `DECIMAL`, `DATE`, `DATETIME`, `STRING`.

`NOT_APPLICABLE` significa que una dimensión no corresponde al dataset (por ejemplo, no hay candidate identifiers). `INSUFFICIENT_DATA` significa que podría corresponder, pero no hay observaciones suficientes (por ejemplo, consistency con menos de 10 valores). Ninguno es una confidence.

## Contratos conceptuales normativos

### DatasetProfile

`dataset_id`, `metadata` (source_name minimizado, row_count, column_count), `columns`, `quality`, `findings`, `recommendations`, `analysis_state`. Los findings de dataset y columna se referencian por id; cualquier vista de classifications se deriva de `columns[].classifications`.

### ColumnProfile

Contrato mínimo: `column_id`, `name`, `position`, `primitive_type`, `nullable`, `row_count`, `non_null_count`, `null_count`, `null_rate`, `distinct_count`, `unique_rate`, `cardinality`, `basic_statistics`, `candidate_identifier`, `classifications`, `findings`.

`position` es cero-based y estable para el archivo analizado. `nullable` expresa presencia observada de al menos un nulo, no obligatoriedad de negocio. `cardinality` es una etiqueta derivada de `distinct_count/non_null_count`; `basic_statistics` puede ser vacío cuando no aplica. `candidate_identifier` es un objeto/estado estructural, no una primary key. `classifications` y `findings` contienen referencias o elementos con id únicos.

### Finding

Contrato: `id`, `assertion_level`, `severity`, `confidence`, `category`, `subject`, `title`, `description`, `method`, `evidence_ids`, `recommendation_ids`. Un finding siempre tiene al menos una evidence canónica. `DETECTED` procede solo de regla determinista y usa confidence `HIGH`; `INFERRED` conserva método, señales y confidence; ningún finding `SUGGESTED` sustituye una métrica o clasificación canónica.

### Evidence

Contrato: `id`, `type`, `subject`, `rule_id`, `rule_version`, `metric`, `observed_value`, `denominator`, `affected_rows`, `sample_policy`. Puede ser métrica o señal determinista. No contiene el dataset completo; muestras son opcionales, redactadas y limitadas. Toda evidence canónica es creada por profiling/reglas deterministas, nunca por LLM.

### Classification

Contrato: `id`, `column_id`, `semantic_type`, `governance_categories`, `assertion_level`, `confidence`, `method`, `signals`, `evidence_ids`. Las classifications canónicas son `INFERRED` a partir de señales deterministas. Una propuesta únicamente LLM es `SUGGESTED`, no se añade a `ColumnProfile.classifications` canónicas en V0.1 y no tiene confidence canónica.

### Recommendation

Contrato: `id`, `finding_id`, `priority`, `action`, `rationale`, `assertion_level: SUGGESTED`. Nunca existe sin Finding. Puede redactarse a partir de un finding `DETECTED` o `INFERRED`, pero no aumenta severity ni transforma una inferencia en hecho.

### QualityScore

Contrato: `overall_score`, `dimensions`, `applied_weights`, `applicability`, `not_applicable_reasons`, `model_version`. `model_version` para V0.1 es exactamente `0.1`. Cada dimensión declara score solo si es `APPLICABLE`; declara razón si es `NOT_APPLICABLE` o `INSUFFICIENT_DATA`. `overall_score` se calcula solo con pesos aplicados y no usa Confidence.

## Ejemplos conceptuales

```json
{"id":"F-GOV-001","assertion_level":"INFERRED","severity":"HIGH","confidence":"MEDIUM","category":"potential_personal_data","subject":{"column_id":"col:email"},"method":"governance_signals_v0.1","evidence_ids":["E-011"]}
```

```json
{"id":"L-CLS-001","column_id":"col:contact","semantic_type":"CONTACT_INFORMATION","assertion_level":"SUGGESTED","source":"LLM","advisory_only":true}
```

```json
{"overall_score":92,"dimensions":{"structural_completeness":100,"uniqueness":96,"validity":95,"consistency":null},"applied_weights":{"structural_completeness":35,"uniqueness":25,"validity":25},"applicability":{"consistency":"INSUFFICIENT_DATA"},"not_applicable_reasons":{"consistency":"fewer_than_10_valid_non_null_values"},"model_version":"0.1"}
```

```json
{"column_id":"col:customer_id","candidate_identifier":{"kind":"STRUCTURAL_CANDIDATE_IDENTIFIER","name_signal":true,"non_null_rate":1.0,"unique_rate":0.995,"confirmed_key":false}}
```

## Invariantes y estados

- Cada Finding tiene evidence canónica; cada Recommendation tiene finding existente.
- `severity` mide impacto; `confidence`, certeza. Un finding puede ser `HIGH`/`MEDIUM`.
- Las inferencias y sugerencias no alimentan quality metrics ni scores.
- El LLM no crea ni muta Evidence, Findings `DETECTED`, métricas, scores o classifications canónicas.
- Estados: `RECEIVED → VALIDATED → PROFILED → ANALYZED → COMPLETED`, o `REJECTED/FAILED`; terminales activan limpieza temporal.
