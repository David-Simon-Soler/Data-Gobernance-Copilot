# Ingestion V0.1

## Responsabilidad

La ingestión convierte bytes CSV/XLSX no confiables en `IngestedDataset`, una representación interna estable con dataframe Polars, metadata, warnings técnicos y nombre de sheet cuando aplica. No hace profiling, inferencia semántica, quality score, governance, recomendaciones ni IA.

## Formatos y límites

Solo se aceptan `.csv` y `.xlsx`. Límites por defecto: 5 MiB de archivo, 100.000 filas, 250 columnas, 20 hojas, 1.000.000 celdas, 2.000 entradas ZIP y 20 MiB de tamaño XLSX descomprimido. Los errores exponen códigos seguros: formato no soportado, archivo demasiado grande, límite de dataset, dataset malformado, vacío o sheet inexistente.

## Política CSV

Acepta UTF-8 y UTF-8 con BOM. Otros encodings se rechazan. Los delimitadores permitidos son coma, punto y coma, tab y pipe; se selecciona determinísticamente desde una muestra corta y un empate multicolumna se rechaza como ambiguo. Cabeceras vacías o duplicadas y filas con ancho inconsistente se rechazan; no se renombran ni normalizan. Un archivo con solo cabecera es válido con warning `header_only_dataset`.

## Política XLSX

Solo `.xlsx`; `.xls` y `.xlsm` se rechazan. El archivo debe ser ZIP válido y respetar límites de entradas/tamaño descomprimido. No se fusionan hojas. Con selección explícita se usa esa sheet; sin ella, se usa la primera visible y no vacía. Hojas vacías, corruptas, cabeceras inválidas y celdas fuera de columnas de cabecera se rechazan.

Workbook se abre en modo lectura, sin enlaces externos. Las fórmulas no se ejecutan ni se usan cached values: se convierten a valor no disponible y añaden warning `formulas_not_evaluated` con count. Macros nunca se ejecutan.

## Seguridad

La API de dominio procesa bytes y no construye paths con filenames. No hay temporales en la implementación actual. Los valores no se registran ni se deben renderizar como HTML crudo. Errores no incluyen contenido de filas, paths internos o trazas. La ingesta trata XLSX como ZIP/XML no confiable y aplica límites antes de normalizar.
