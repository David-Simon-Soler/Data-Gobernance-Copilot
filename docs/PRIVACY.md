# Privacidad y seguridad

## Lifecycle, minimización y estado actual

El modo objetivo es local: procesamiento temporal, sin persistencia por defecto y cleanup ante éxito, fallo, cancelación o expiración. Phase 1.1 procesa bytes enteramente en memoria y no crea temporales. Si una fase futura necesita disco, usará un directorio por análisis con permisos restringidos y la misma limpieza de estado terminal.

No se registran valores, filas, muestras, nombres completos ni contenido sensible; solo ids efímeros, tamaños, errores clasificados y métricas agregadas mínimas. Errores HTTP futuros no deben exponer valores, filas, paths internos ni trazas de dataset.

## Controles implementados

Los filenames son metadata no confiable y no construyen paths. Se aplican límites por archivo: tamaño, filas, columnas, sheets, celdas, entradas ZIP y tamaño descomprimido. CSV acepta UTF-8/UTF-8 BOM y delimitadores comma, semicolon, tab y pipe; encoding o delimitador ambiguo se rechazan. XLSX se valida como ZIP no confiable, se abre read-only con enlaces externos desactivados, no ejecuta fórmulas/macros y convierte fórmulas a valor no disponible.

Celdas y encabezados nunca se deben renderizar como HTML crudo ni tratar como instrucciones de sistema o prompt. No hay logging de contenido.

## Controles previstos

La frontera HTTP pública añadirá límites de request, tiempo, memoria y concurrencia, rate limiting y aislamiento de ejecución. La demo pública usará solo fixtures sintéticos y límites más estrictos.

`none` es el proveedor IA por defecto. Si se activa un proveedor futuro, se informará qué sale del equipo; se enviarán primero metadata, métricas y findings. Nunca se enviará el dataset completo salvo consentimiento explícito y necesidad justificada; muestras mínimas, redactadas y opt-in cuando sea viable.
