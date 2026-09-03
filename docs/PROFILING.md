# Dataset Profiling V0.1

## Objetivo y límites

Phase 2 transforma un `IngestedDataset` ya validado en `DatasetProfile` determinista. Describe estructura y propiedades observables; no vuelve a parsear archivos ni modifica el DataFrame original. No calcula quality scores, no aplica reglas de negocio, no clasifica gobernanza, no detecta datos personales, no recomienda y no usa IA.

## Modelo

`DatasetProfile` contiene row/column count, perfiles de columna, métricas de filas duplicadas completas, candidate identifiers, findings/evidence estructurales, metadata de fuente y `model_version: "0.1"`. No incluye `QualityScore` en esta fase.

Cada `ColumnProfile` incluye nombre, posición cero-based, dtype físico Polars, tipo inferido, counts de null/no-null, distinct/uniqueness/cardinality ratio, exceso de duplicados no nulos, flags all-null/constant, candidate identifier, estadísticas y referencias de findings. `classifications` permanece vacío: las classifications siguen siendo responsabilidad de una fase posterior.

## Primitive type inference

Tipos runtime: `NULL`, `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `DATE`, `DATETIME`. `FLOAT` es la representación estructural de profiling; Phase 3 podrá mapearla a la categoría `DECIMAL` definida por el Quality Model, sin modificar ese contrato.

La inferencia es conservadora y usa todos los valores no nulos observados. No convierte el DataFrame:

- `BOOLEAN`: bool físico o strings `true`/`false`, case-insensitive. `yes/no` y `0/1` no son booleanos.
- `INTEGER`: enteros físicos no booleanos o strings ASCII enteros sin ceros iniciales salvo `0`.
- `FLOAT`: floats físicos finitos o strings decimales con punto; no coma decimal, separadores de miles, exponentes, `NaN` ni infinitos.
- `DATE`: `YYYY-MM-DD` válido, sin locale.
- `DATETIME`: ISO con `T`, segundos, fracción opcional y `Z`/offset opcional; datetimes físicos, incluidos timezone-aware, también aplican.
- Cualquier mezcla, formato ambiguo como `01/02/2025`, código con ceros iniciales o valor no finito resulta `STRING`.

`NULL` se usa cuando no existen valores no nulos. El vacío string es un valor string, no null. `"NA"`, `"N/A"`, `"null"` y `"-"` tampoco se convierten a null.

## Distinct, uniqueness y duplicados

`distinct_count` es el número de valores distintos no nulos. `uniqueness_ratio = distinct_count / non_null_count`; si no hay valores no nulos, es `None`. `duplicate_excess_rows = non_null_count - distinct_count`, equivalente a sumar `k-1` en cada grupo no nulo repetido. Los nulls no participan.

Para filas completas, se agrupan todas las columnas de forma determinista. `duplicate_row_count` cuenta todas las filas de grupos repetidos; `duplicate_excess_row_count` suma `k-1`; `complete_duplicate_group_count` cuenta grupos. La primera posición se considera retenida. Estas métricas no penalizan score todavía.

Para un dataset sin filas, cada columna tiene `null_count=0`, `null_ratio=0.0`, `uniqueness_ratio=None`, `is_all_null=False`, `is_constant=False`, sin candidate identifier ni finding all-null; sus estadísticas son `None`.

## Statistics

- INTEGER/FLOAT: min, max, mean, median y desviación estándar poblacional (`ddof=0`).
- DATE/DATETIME: min y max como objetos Python `date`/`datetime`, no strings. Los datetimes con offset se normalizan a UTC sin `tzinfo` antes de compararse.
- STRING: longitudes mínima, máxima y media por caracteres Unicode.

Una columna física numérica que contiene un valor no finito se infiere como `STRING`, pero no recibe estadísticas de longitud: `basic_statistics=None`.

No se guardan top values ni muestras de valores.

## Candidate identifiers

El único nombre es `STRUCTURAL_CANDIDATE_IDENTIFIER`; nunca primary key confirmada.

- Señal de nombre `id`, `identifier`, `uuid`, `guid` o sufijo `_id`, sin distinguir casing: al menos 10 filas, completeness ≥95% y uniqueness ≥98%.
- Sin señal de nombre: al menos 100 filas, completeness ≥99% y uniqueness ≥99.9%.
- `code` no es señal de nombre.

El perfil guarda razón, señal de nombre, completeness, uniqueness y los umbrales aplicados. Es un descriptor estructural, no una clasificación semántica.

## Findings y evidence

Las mediciones observables son findings `DETECTED` con confidence `HIGH`: filas completamente duplicadas (`WARNING`), columna all-null (`WARNING`) y columna constante (`INFO`).

Un candidate identifier es un finding `INFERRED`, de severidad `INFO` y confidence `HIGH`: satisface reglas estructurales deterministas pero no confirma una clave ni un identificador semántico. `AssertionLevel` admite además `SUGGESTED`; esta fase no genera sugerencias. `Confidence` admite `LOW`, `MEDIUM` y `HIGH`; `Severity` admite `INFO`, `WARNING`, `HIGH` y `CRITICAL`.

Cada finding tiene evidence métrica versionada. Para candidate identifiers, los detalles contienen solo row count, completeness, uniqueness, señal de nombre, regla y versión aplicadas, y umbrales; no incluyen muestras ni valores de fila.

## Determinism y límites

Mismo DataFrame y versión `0.1` producen el mismo perfil. No hay timestamps analíticos. El profiling opera dentro de los límites de ingestión: hasta 100.000 filas, 250 columnas y 1.000.000 celdas. Usa agregaciones Polars para counts, duplicados y statistics; la inferencia por columna materializa solo sus valores no nulos para aplicar parsers explícitos.
