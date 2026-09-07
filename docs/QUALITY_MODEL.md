# Modelo de calidad V0.1

**Quality Model Version: 0.1**. El score mide *structural readiness* de un único dataset; no mide obligatoriedad de negocio, corrección de negocio ni cumplimiento. Se redondea solo al final y expone numeradores, denominadores, pesos y aplicabilidad.

## Datos base y aplicabilidad

Sea `R` filas, `C` columnas y `N=R×C`. Un nulo es un valor `null` del DataFrame. V0.1 no configura marcadores textuales de null: `""`, `"0"` y `"false"` no son nulos, y CSV conserva los campos vacíos como strings. `R=0` produce `overall_score=null`, todas las dimensiones `INSUFFICIENT_DATA` y razón `empty_dataset`.

`APPLICABLE` tiene denominador y regla válidos; `NOT_APPLICABLE` no tiene sujeto estructural (p. ej., sin candidate identifiers); `INSUFFICIENT_DATA` podría aplicar pero faltan observaciones. Las dimensiones no aplicables no reciben score ni peso. Las columnas constantes, categorías legítimas y texto no se penalizan por uniqueness.

## Quality parser type selection

Quality aplica trim externo solo para validar, sin mutar el DataFrame ni cambiar nulls. `ColumnProfile.inferred_primitive_type` (Profiling) exige que todos los valores no nulos sean compatibles; por separado, `QualityColumnSignals.primitive_type` selecciona un parser cuando al menos **98%** de los valores no nulos lo superan. El resto cuenta como invalid para Validity. Sin parser al 98%, Quality usa `STRING`; sin valores no nulos usa `NULL`.

Antes de tipos numéricos: si al menos 95% de tokens son dígitos de anchura mayor que uno y comienzan con `0`, se conserva `STRING` para proteger códigos como `00123`.

Precedencia de selección Quality: `BOOLEAN -> INTEGER -> FLOAT -> DATE -> DATETIME -> STRING`. Los parsers DATE y DATETIME usan formas ISO distintas, por lo que una fecha-hora no se degrada a fecha.

- `BOOLEAN`: bool físico o strings `true/false`, `yes/no` en cualquier casing; `0/1` no son Boolean válidos.
- `INTEGER`: regex ASCII `^[+-]?(0|[1-9][0-9]*)$`; sin separadores de miles.
- `FLOAT`: regex ASCII `^[+-]?(0|[1-9][0-9]*)\.[0-9]+$`; solo punto decimal, sin separadores de miles, coma decimal ni exponentes.
- `DATE`: ISO exacto `YYYY-MM-DD`, calendario válido.
- `DATETIME`: ISO exacto `YYYY-MM-DDTHH:MM:SS`, fracción opcional y sufijo opcional `Z` o `±HH:MM`; calendario/hora válidos.

`01/02/2025`, fechas con slash, coma decimal, separadores de miles y formatos locales permanecen `STRING`; V0.1 no emite un finding de fecha ambigua. El locale es invariable: ISO/ASCII únicamente.

## Dimensiones y fórmulas

### Observed completeness y structural completeness — peso 35

Siempre se muestra `observed_completeness = 100×(1−null_cells/N)` si `N>0`; es un hecho, no afirma defecto. El componente de score usa únicamente candidate identifiers estructurales `I`:

`C_s = 100×(1−Σ null_count_i / (R×|I|))`.

Con `I=∅`, structural completeness es `NOT_APPLICABLE`, razón `no_structural_candidate_identifier`. Nulos de otras columnas se reportan como missingness observada, normalmente `INFO`, no penalizan score ni generan finding severo automáticamente. Nulos en candidate identifiers son señal estructural. Así el score no presupone columnas de negocio obligatorias.

### Candidate identifiers y uniqueness — peso 25

Una columna es `STRUCTURAL_CANDIDATE_IDENTIFIER`, nunca primary key confirmada, si `R≥10` y cumple:

1. nombre compatible de lista versionada (`id`, `identifier`, `uuid`, `guid` como token completo, o sufijo `_id`) **y** `non_null_rate≥0.95` y `unique_rate≥0.98`; o
2. sin señal de nombre, `R≥100`, `non_null_rate≥0.99` y `unique_rate≥0.999`.

`code` por sí solo nunca es señal compatible. Para un grupo repetido de tamaño `k`, `duplicate_excess_rows = k−1`; se conservan por posición las primeras filas del grupo y las posteriores son exceso. Para candidato `i`, `d_i=duplicate_excess_rows_i/non_null_i`.

`duplicate_row_excess` sigue la misma regla sobre filas completas. Para impedir doble penalización, se forma el conjunto `E_id` de posiciones de exceso de todos los candidatos; `duplicate_row_excess_uncovered` cuenta solo posiciones de exceso de fila completa fuera de `E_id`; `D_u=duplicate_row_excess_uncovered/R`.

Con `I` no vacío: `U=100×(1−min(1,0.8×average(d_i)+0.2×D_u))`. Sin `I` y `R≥2`: `U=100×(1−duplicate_row_excess/R)`. Con `R<2`: `INSUFFICIENT_DATA`, razón `fewer_than_two_rows`. Los dos tipos de duplicado pueden producir findings independientes; el solapamiento no se penaliza dos veces en score.

### Validity — peso 25

Para cada columna cuyo Quality parser type es `BOOLEAN`, `INTEGER`, `FLOAT`, `DATE` o `DATETIME`, `invalid_i` es el número de valores no nulos que no pasa el parser exacto. `STRING` y `NULL` no aplican. `V=100×(1−Σinvalid_i/Σnon_null_i)` sobre elegibles. Si no hay columnas elegibles, `NOT_APPLICABLE`, razón `no_typed_columns`. Los inválidos generan únicamente `malformed_value` en V0.1.

### Consistency — peso 15

Solo usa familias deterministas conocidas, sin NLP ni reglas de negocio. Una columna es elegible con al menos 10 valores no nulos y al menos 98% de valores válidos en una de estas familias: BOOLEAN (lower/upper/title de `true/false` o `yes/no`), INTEGER/FLOAT (signo ausente, `+` o `-`; float siempre con `.`), DATE ISO y DATETIME ISO (sin timezone, `Z` u offset `±HH:MM`).

Cada valor válido se asigna a su familia léxica exacta. El formato dominante es la familia más frecuente; en empate se toma el identificador de familia lexicográficamente menor. `inconsistent_i` cuenta valores válidos fuera de la familia dominante; los inválidos se cuentan solo en validity. `S=100×(1−Σinconsistent_i/Σvalid_non_null_i)`. Sin elegibles: `INSUFFICIENT_DATA` si hay familias potenciales con <10 valores; en otro caso `NOT_APPLICABLE` con razón `no_recognized_format_family`.

## Agregación e interpretación

Pesos base: structural completeness 35, uniqueness 25, validity 25, consistency 15. Para dimensiones `APPLICABLE` `A`:

`Overall=round(Σ(score_j×weight_j)/Σ(weight_j), j∈A)`.

`90–100`: pocas anomalías estructurales medibles; `75–89`: revisar warnings; `50–74`: problemas materiales; `<50`: revisar antes de uso analítico. Son bandas de comunicación, no garantía. Si `A` es vacío, `overall_score=null`. El resultado siempre declara `model_version: "0.1"`.
