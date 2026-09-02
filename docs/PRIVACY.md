# Privacidad y seguridad

## Lifecycle y minimización

Modo local: archivo temporal, sin persistencia por defecto y limpieza ante éxito, fallo, cancelación o expiración. El temporal vive en directorio por análisis con permisos restringidos al proceso; se elimina al estado terminal. No se registran valores, filas, muestras, nombres completos o contenido sensible: solo ids efímeros, tamaños, errores clasificados y métricas agregadas mínimas. La evidencia usa counts y ejemplos mínimos redactados.

Se configuran límites por request y de concurrencia: bytes, filas, columnas, hojas, tiempo, memoria y número simultáneo de análisis. Los errores HTTP son seguros: no devuelven filas, valores, paths internos ni trazas del dataset.

## Ingestion segura

- Solo `.csv` y `.xlsx`, con extensión y contenido verificados; `.xlsm` se rechaza.
- CSV V0.1 acepta UTF-8 o UTF-8 con BOM; otro encoding se rechaza. Delimitador permitido: coma, punto y coma o tab, detectado una vez desde una muestra limitada; si es ambiguo se rechaza.
- XLSX se trata como ZIP/XML no confiable: límites comprimidos, descomprimidos, de entradas, tamaño XML y profundidad/recursos de parser; archivos malformados se rechazan controladamente.
- Enlaces externos XLSX se ignoran. Fórmulas se tratan como datos literales o resultados ya almacenados, nunca se evalúan; macros no se ejecutan.
- Celdas y encabezados nunca se renderizan como HTML crudo, ni se usan como instrucciones de sistema o prompt.

## Demo e IA futuras

La demo pública usa solo fixtures sintéticos, límites más estrictos, rate limiting, aislamiento de ejecución y telemetría sin contenido. `none` es el proveedor IA por defecto. Si se activa uno futuro, se informa qué sale del equipo: primero metadata, métricas y findings; nunca el dataset completo salvo consentimiento explícito y necesidad justificada. Muestras mínimas, redactadas y opt-in cuando sea viable.
