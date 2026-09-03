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
