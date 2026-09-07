# Quality Engine V0.1

`evaluate_quality(profile)` recibe exclusivamente un `DatasetProfile` inmutable. No lee archivos, no reejecuta profiling y no conserva valores de celdas. Devuelve `QualityScore` con dimensiones, pesos aplicados, aplicabilidad, razones, findings/evidence de calidad y versión `0.1`.

## Aplicabilidad y cálculo

Las dimensiones usan `APPLICABLE`, `NOT_APPLICABLE` o `INSUFFICIENT_DATA`. Solo las aplicables entran en el denominador de pesos 35/25/25/15. El overall usa Python `round`, por tanto aplica round-half-to-even en empates: `round(84.5) == 84` y `round(85.5) == 86`. Si no hay dimensiones aplicables, `overall_score` es `None`.

`observed_completeness` mide todas las celdas y es informativa. Structural completeness solo considera structural candidate identifiers. Un dataset vacío deja todas las dimensiones como `INSUFFICIENT_DATA` con razón `empty_dataset`.

## Señales estructurales

Profiling recoge señales deterministas sin calcular scores, pesos, penalties ni recomendaciones. Para validación se aplica trim externo a tokens string, sin mutar el DataFrame ni convertir strings vacíos en null. La protección de códigos con ceros iniciales se activa con al menos 95% de tokens string elegibles. Booleanos válidos se aceptan sin distinguir casing; las familias léxicas exactas son lower, upper y title. Casing no canónico se conserva como descriptor `BOOLEAN_OTHER`, nunca se hace pasar por title.

## Duplicados e invalid values

Profiling conserva posiciones de exceso sin valores de celdas. Quality Engine forma la unión de excesos de identificador y descuenta esa unión de filas completas antes de calcular `D_u`.

Cuando una columna tipada tiene valores no nulos que fallan su parser V0.1, Quality Engine emite un finding `DETECTED` `malformed_value` y una evidence versionada con counts, denominador, tipo esperado y regla. No contiene valores, muestras ni filas. No se usa `type_issue`: el contrato no aporta una distinción operativa adicional.

## Límites del resultado

Validity y consistency usan únicamente parsers y familias léxicas canónicas V0.1; no usan reglas de negocio, semántica ni NLP. El score no es certificación, compliance score, garantía de calidad, corrección de negocio ni evaluación legal. No genera recomendaciones, governance classifications ni resultados de IA.

## Quality Finding Bridge — contrato V0.1

Para permitir recomendaciones sin derivar hechos desde score internals, Quality expone findings canónicos adicionales sobre condiciones ya calculadas. El bridge está implementado y forma parte del output runtime V0.1.

### Duplicate structural identifier

- Rule ID: `QUALITY-IDENTIFIER-DUPLICATE-001`, version `0.1` (activo en el contrato Quality Model 0.1).
- Condition: `is_candidate_identifier` y `duplicate_excess_rows > 0`.
- Finding ID: `F-QUALITY-COL-{position}-DUPLICATE-IDENTIFIER`.
- Category: `duplicate_structural_identifier`; assertion `DETECTED`; severity `WARNING`; confidence `HIGH`.
- Evidence ID: `E-QUALITY-COL-{position}-DUPLICATE-IDENTIFIER`.
- Evidence: `column_id`, `column_position`, `row_count`, `non_null_count` (denominator), `duplicate_excess_rows`, flag `structural_candidate_identifier`, rule ID y versión. No duplicate values, muestras ni filas.
- Mensaje: “Duplicate excess rows were detected in structural candidate identifier column {column_name}.” Nunca afirma primary key ni constraint violation.
- Orden: posición de columna ascendente; dentro de una columna, el finding precede a otros findings Quality de esa columna.

Este finding es el único source contract que habilita `REC-QUALITY-DUPLICATE-ID-001` (P0 / `DATA_QUALITY`).

### Structural missingness

`null_count > 0` en un structural candidate identifier ya participa en structural completeness. `QUALITY-IDENTIFIER-MISSING-001` queda activo como finding `DETECTED` `structural_identifier_missingness`, severity `WARNING`, con `null_count`, `non_null_count`, `row_count` y el flag de candidato. No activa ninguna Recommendation V0.1; su recomendación queda diferida.

### Otras condiciones

- `duplicate_row_excess` completo: ya se calcula y se evita doble penalización en score; finding separado y cualquier recommendation quedan diferidos hasta cerrar su contrato downstream.
- `malformed_value`: permanece activo y es el único finding de validity actual.
- Consistency calcula métricas, pero no emite finding canónico; cualquier recommendation queda diferida.
