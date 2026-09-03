# Recommendation Engine — Operational Contract

## Recommendation Model 0.1

Este documento define el contrato operativo implementado en Phase 5.1. La salida convierte findings analíticos existentes en acciones `SUGGESTED`; nunca crea hechos, evidence, findings ni clasificaciones nuevas.

`Quality Model 0.1`, `Governance Model 0.1` y `Recommendation Model 0.1` son versiones independientes.

### Arquitectura y límites

```text
QualityScore ─┐
              ├─> Recommendation Engine ─> RecommendationSet
GovernanceAssessment ┘
```

La entrada preferida es `recommend(quality: QualityScore, governance: GovernanceAssessment)`. El motor consume únicamente salidas canónicas, no reabre archivos, no accede a DataFrame ni valores raw, no reprofilea, no recalcula Quality/Governance y no muta ninguna entrada, `Finding` o `Evidence`. No usa IA, persistencia, DB ni recomendaciones legales.

Todo objeto Recommendation tiene `assertion_level: SUGGESTED`, sin excepciones.

### Recommendation

Se preservan los campos normativos de `DOMAIN.md` (`id`, `finding_id`, `priority`, `action`, `rationale`, `assertion_level`). Para operar el contrato V0.1 se añaden explícitamente:

- `source`: `QUALITY` o `GOVERNANCE`.
- `category`: categoría operativa canónica.
- `rule_id`: regla `REC-*` que produjo la salida.
- `model_version`: exactamente `0.1`.

La implementación usará el nombre existente `id` como `recommendation_id` conceptual. No se almacenan valores, muestras, filas ni evidence duplicada.

Una Recommendation referencia exactamente un `finding_id` primario resoluble. No existen recomendaciones huérfanas ni referencias a findings inexistentes.

### RecommendationSet

`RecommendationSet` contiene:

- `recommendations`: tupla ordenada de Recommendations.
- `summary.total_count`.
- `summary.counts_by_priority`.
- `summary.counts_by_category`.
- `model_version: "0.1"`.

No contiene recommendation score, risk score ni compliance score. Un input sin findings elegibles produce un conjunto vacío y un summary válido; nunca se fabrica una recomendación de “todo correcto”.

## Taxonomía operativa

Categorías, en orden canónico:

1. `DATA_QUALITY`
2. `GOVERNANCE`
3. `PRIVACY_REVIEW`

Son categorías de organización de acciones, no categorías legales.

Fuentes, en orden canónico: `QUALITY`, `GOVERNANCE`.

## Prioridad

`Severity` describe la importancia analítica del finding. `Priority` describe el orden sugerido de acción; no es severity, nivel legal ni riesgo de privacidad.

Política canónica V0.1 aprobada:

- `P0`: acción requerida antes de confiar en una asunción de identidad estructural; se activa para duplicados en un `STRUCTURAL_CANDIDATE_IDENTIFIER`.
- `P1`: corregir o revisar un defecto determinista que afecta la confianza de uso, o documentar el manejo de una clasificación potencial personal/quasi-identifier.
- `P2`: mejora documental de menor impacto.

No se inventan porcentajes ni se asigna prioridad automáticamente por igualdad con `Severity`.

## Reglas activas

| Rule ID | Source | Source finding/rule | Condition | Priority | Category | Action template | Rationale policy | Deduplication key | Assertion | Version |
|---|---|---|---|---|---|---|---|---|---|---|
| `REC-QUALITY-DUPLICATE-ID-001` | QUALITY | `category=duplicate_structural_identifier`, `QUALITY-IDENTIFIER-DUPLICATE-001` | Finding `DETECTED` resoluble para candidato estructural | P0 | `DATA_QUALITY` | “Review and resolve duplicate values in the structural candidate identifier column before relying on it for unique record identification.” | Incluye únicamente el `duplicate_excess_rows` agregado del finding/evidence; nunca valores raw. | `(source, rule_id, finding_id)` | `SUGGESTED` | `0.1` |
| `REC-QUALITY-MALFORMED-001` | QUALITY | `category=malformed_value`, actual parser rule `quality_validity_parser_v0_1` | Finding `DETECTED` resoluble | P1 | `DATA_QUALITY` | “Inspect and correct values that fail the expected structural parser for this column before downstream use.” | Explica que la acción deriva del parser determinista y enlaza el finding; no repite valores. | `(source, rule_id, finding_id)` | `SUGGESTED` | `0.1` |
| `REC-GOV-PERSONAL-001` | GOVERNANCE | `category=POTENTIAL_PERSONAL_DATA`, `GOV-PERSONAL-001` | Finding `INFERRED` resoluble | P1 | `PRIVACY_REVIEW` | “Review and document the intended handling, ownership and retention expectations for fields inferred as potential personal data.” | Usa lenguaje potencial/inferido y remite a la clasificación y su evidence. | `(source, rule_id, subject column_id)` | `SUGGESTED` | `0.1` |
| `REC-GOV-QUASI-001` | GOVERNANCE | `category=QUASI_IDENTIFIER`, `GOV-QUASI-001` | Finding `INFERRED` resoluble y combinación participante | P1 | `GOVERNANCE` | “Review whether this combination of fields needs additional governance documentation before broader sharing or reuse.” | Explica que la acción sigue a una clasificación potencial; nunca afirma reidentificación. | `(source, rule_id, finding_id)` | `SUGGESTED` | `0.1` |

Las plantillas son literales y deterministas. Pueden interpolar únicamente nombres de columna o counts agregados ya presentes en el finding/evidence cuando el producto apruebe su exposición; nunca valores raw.

## Inventario de findings y decisiones de emisión

### Quality

El Quality Engine actual emite `malformed_value` (`DETECTED`, `WARNING`, parser determinista) dentro de `QualityScore.findings`; el finding de duplicado estructural definido en el bridge forma parte de la salida canónica adicional. Findings de profiling como duplicados completos o candidatos estructurales no forman parte de `QualityScore.findings`; quedan fuera hasta que exista un contrato downstream explícito.

`REC-QUALITY-DUPLICATE-ID-001` y `REC-QUALITY-MALFORMED-001` son las reglas Quality activas. No se diseñan recomendaciones para dimensiones sin finding (`completeness`, `uniqueness`, `consistency`) ni para scores.

### Governance

El Governance Engine emite findings `INFERRED` por clasificación. Las únicas categorías activas para recomendaciones son:

- `POTENTIAL_PERSONAL_DATA` → `REC-GOV-PERSONAL-001`.
- `QUASI_IDENTIFIER` → `REC-GOV-QUASI-001`.

`CONTACT_INFORMATION` y `DEMOGRAPHIC_INFORMATION` ya derivan en `POTENTIAL_PERSONAL_DATA`; no generan recomendaciones independientes. `IDENTIFIER` por sí solo no genera recomendación. `FINANCIAL_INFORMATION`, `BUSINESS_METRIC`, `TEMPORAL_FIELD`, `GEOGRAPHIC_INFORMATION` y `CATEGORICAL_DIMENSION` no generan recomendación por sí solos.

### Free text

Política aprobada: `FREE_TEXT` no genera recomendación en V0.1. El perfil no inspecciona contenido, por lo que no se afirma presencia de datos personales ni sensibles. Una acción documental específica queda diferida para evitar ruido.

## Traceabilidad y evidence

La única cadena válida es:

`Recommendation → finding_id → Finding.evidence_ids → Evidence`

El motor no crea ni copia `Evidence`. Cada `finding_id` debe resolver dentro de la entrada correspondiente; todas sus evidence deben resolver a objetos existentes. No hay muestras, filas, ejemplos ni campos raw en RecommendationSet.

## Deduplicación y alcance

V0.1 es finding-scoped: una Recommendation corresponde a un finding. La clave de deduplicación es la declarada por la regla. Si el mismo finding aparece repetido en una entrada, gana la primera instancia según el orden canónico y se emite una sola recomendación. No se agregan automáticamente columnas ni findings semánticamente similares.

Personal data se deduplica por columna y regla: las clasificaciones CONTACT/IDENTIFIER/DEMOGRAPHIC no generan acciones adicionales cuando ya existe `POTENTIAL_PERSONAL_DATA` para la columna. Un finding QUASI cross-column conserva un único `finding_id` y una acción para el conjunto participante.

## Orden determinista

1. Priority (`P0`, `P1`, `P2`).
2. Source (`QUALITY`, `GOVERNANCE`).
3. Orden de declaración de `REC-*`.
4. Posición de columna cuando exista; para reglas dataset/cross-column, posición mínima participante.
5. `finding_id`.
6. `id` de Recommendation.

Se usan tuplas ordenadas, no orden de hash maps, UUID, timestamps ni aleatoriedad. Mismos inputs producen un `RecommendationSet` idéntico.

## Acción, rationale y claims

`action` propone un siguiente paso y no repite simplemente el finding. `rationale` explica por qué ese paso se deriva del finding/evidence existente sin crear hechos.

Nunca se afirma: GDPR compliance/no-compliance, obligación legal, PII cierta, datos personales confirmados, quasi-identifier confirmado, reidentificación, garantía de corrección, garantía de remediación o auditoría oficial.

Se permiten: `review`, `investigate`, `document`, `consider`, `resolve detected duplicates`, `inspect malformed values`, `validate expected formatting` y `clarify ownership`.

## Ejemplos canónicos

### Defecto de parser

- Source finding: `F-QUALITY-COL-2-MALFORMED-VALUE`, `quality_validity_parser_v0_1`.
- Rule: `REC-QUALITY-MALFORMED-001`.
- Priority/category: `P1` / `DATA_QUALITY`.
- Action: inspeccionar y corregir valores que no cumplen el parser esperado.
- Rationale: el parser determinista detectó valores inválidos; revisar antes del uso downstream.
- Trace: Recommendation → finding → evidence métrica.

### Potential personal data

- Source finding: finding `INFERRED` de `GOV-PERSONAL-001`.
- Rule: `REC-GOV-PERSONAL-001`.
- Priority/category: `P1` / `PRIVACY_REVIEW`.
- Action: revisar y documentar manejo, ownership y retención previstos.
- Rationale: las señales deterministas son consistentes con potential personal data; no es una conclusión legal.
- Trace: Recommendation → finding → evidence de Governance.

### Potential quasi-identifier

- Source finding: finding cross-column `INFERRED` de `GOV-QUASI-001`.
- Rule: `REC-GOV-QUASI-001`.
- Priority/category: `P1` / `GOVERNANCE`.
- Action: revisar documentación antes de compartir o reutilizar ampliamente la combinación.
- Rationale: la combinación fue clasificada como potential quasi-identifier; no afirma reidentificación.
- Trace: Recommendation → finding → evidence por IDs/categorías.

### Clasificación sin acción

- Source: `TEMPORAL_FIELD`, `GEOGRAPHIC_INFORMATION`, `FINANCIAL_INFORMATION` o `BUSINESS_METRIC` sin finding elegible.
- Resultado: ninguna Recommendation.
- Razón: una clasificación semántica informativa no implica por sí sola una acción necesaria.

## Deferred

- `REC-QUALITY-DUPLICATE-ROWS-001`: diferida; no se consume directamente profiling y debe resolver solapamiento con duplicados de identificador.
- `REC-QUALITY-CONSISTENCY-001`: diferida mientras consistency no emita finding canónico.
- `REC-GOV-FREETEXT-001`: diferida; requiere decisión sobre ruido y alcance documental.
- Agregación dataset-wide de múltiples columnas personales: diferida; V0.1 es por finding/columna salvo QUASI cross-column.

## Decisiones abiertas para aprobación humana

Las decisiones de prioridad, taxonomía, deduplicación, campos, fuentes y reglas activas están aprobadas para Recommendation Model 0.1.

Quedan diferidos únicamente los comportamientos enumerados en `Deferred`; no deben implementarse como reglas activas.
