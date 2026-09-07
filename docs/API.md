# Analysis API — Operational Contract V0.1

## Purpose and scope

La API implementa el contrato HTTP mínimo para un análisis determinista de un único CSV/XLSX. Es síncrona, stateless y sin persistencia. No incluye autenticación, cuentas, jobs, batch, conectores, IA, chat, billing ni historial.

## Architecture

```text
Client → FastAPI HTTP boundary → analysis orchestration
       → Ingestion → Profiling → Quality → Governance → Recommendations
       → one AnalysisResponse
```

FastAPI coordina; los motores conservan la propiedad de sus reglas y contratos.

## Endpoints

### `GET /health`

Se conserva la respuesta actual: `200 {"status":"ok"}`. No es un health monitor de infraestructura.

### `POST /api/v1/analyze`

`multipart/form-data` con campo obligatorio `file`; el soporte multipart usa la dependencia declarada `python-multipart`. Un request analiza un archivo y devuelve una respuesta completa. No se crean endpoints por motor.

`sheet_name` es opcional solo para XLSX. Para CSV se rechaza si se envía con valor no vacío (`400`). Un valor vacío equivale a no seleccionar hoja. El nombre Unicode se pasa literalmente; una hoja inexistente produce `400` con código `sheet_not_found`. La selección por índice no existe.

El MIME declarado por el cliente no prueba el formato: la validación usa filename y contenido según Ingestion. Se aceptan `.csv` y `.xlsx` (case-insensitive). El filename es metadata no confiable, nunca un path; ausencia de filename es `400`.

## Response contract

```json
{
  "schema_version": "0.1",
  "metadata": {
    "source_filename": "customers.csv",
    "source_format": "csv",
    "sheet_name": null,
    "row_count": 12482,
    "column_count": 14,
    "warnings": []
  },
  "analysis": {
    "profiling": {"row_count": 12482, "column_count": 14, "columns": "...", "findings": "...", "evidence": "...", "model_version": "0.1"},
    "quality": {"overall_score": 92, "dimensions": "...", "findings": "...", "evidence": "...", "model_version": "0.1"},
    "governance": {"classifications": "...", "findings": "...", "evidence": "...", "summary": "...", "model_version": "0.1"},
    "recommendations": {"recommendations": "...", "summary": "...", "model_version": "0.1"}
  }
}
```

El ejemplo abrevia colecciones; la respuesta real usa objetos canónicos existentes con nombres `snake_case`. No se duplica Evidence fuera de sus colecciones propietarias. Cada modelo conserva su propia versión; `schema_version` describe solo el envelope HTTP.

## Serialization boundary

Se reutilizan `DatasetProfile`, `QualityScore`, `GovernanceAssessment` y `RecommendationSet` donde sean serializables. Si FastAPI necesita adaptación, se usarán DTOs de transporte mínimos para excluir `IngestedDataset.dataframe` y otros internals; no se crea una segunda jerarquía de dominio. Nunca se serializan DataFrame, bytes, valores de celdas, samples ni paths temporales. Enums se serializan por su valor y fechas/datetimes en formato JSON ISO.

## Orchestration and atomicity

Una capa de aplicación delgada ejecuta, en orden, `ingest_dataset` -> `profile_dataset` -> `evaluate_quality` -> `evaluate_governance` -> `generate_recommendations`. La ruta no contiene reglas. Si falla cualquier etapa, devuelve un error completo; no hay respuesta parcial ni fallback.

## HTTP statuses and errors

Error estable:

```json
{"error":{"code":"malformed_dataset","message":"The uploaded dataset could not be processed."}}
```

Mensajes genéricos y seguros; nunca traceback, excepción de librería, paths ni valores.

| Status | Casos |
|---|---|
| 200 | análisis completo o health correcto |
| 400 | `malformed_dataset`, `empty_dataset`, `sheet_not_found`, `sheet_name` inválido para CSV |
| 413 | `file_too_large`, límite de request |
| 415 | `unsupported_format` o media no soportada |
| 422 | multipart/campo `file` ausente o forma de request inválida |
| 500 | fallo interno inesperado, con mensaje genérico |

Mapeo de excepciones: `UnsupportedFormatError`→415; `FileTooLargeError`→413; `DatasetLimitError`→400; `MalformedDatasetError`→400; `EmptyDatasetError`→400; `SheetNotFoundError`→400; `IngestionError` no especializado→400.

## Upload and resource limits

El límite de dominio es 5 MiB por archivo; también 100.000 filas, 250 columnas, 20 hojas, 1.000.000 celdas, 2.000 entradas ZIP y 20 MiB XLSX descomprimido. El middleware HTTP debe aplicar un cap exacto de **6 MiB** al body multipart y rechazar durante lectura, antes de entregar bytes al dominio; el payload del fichero sigue limitado a 5 MiB. Starlette puede haber bufferizado parte del body: V0.1 no afirma protección absoluta frente a buffering del servidor; despliegue debe configurar proxy/server limits.

V0.1 es síncrono. El timeout operativo objetivo es **30 segundos**. Concurrencia máxima, workers y memoria son responsabilidad de despliegue y no se fijan valores arbitrarios en el dominio; no hay semáforo, colas ni Redis. Cancelaciones del cliente deben abortar el trabajo y ejecutar cleanup; no se garantiza completar una cancelación ya llegada al parser.

## Warnings and empty datasets

`IngestedDataset.warnings` aparece una sola vez en `metadata.warnings`. Warnings son informativos y no Findings. Header-only, zero-row permitido por Ingestion, one-row y datasets pequeños conservan las semánticas existentes (`INSUFFICIENT_DATA`/`NOT_APPLICABLE`); fórmulas XLSX se representan como unavailable/null según Ingestion.

## Traceability and privacy

El frontend resuelve `Recommendation.finding_id` contra los findings de Quality/Governance y sus `evidence_ids`, sin inferir ownership por strings. No hay persistencia ni almacenamiento posterior al request. La política permite logging operativo de status, duración, tamaño, formato y counts agregados; no permite raw fields, celdas, filas, samples, bytes, paths ni excepciones con contenido.

## CORS, versioning and request ID

CORS permite solo orígenes explícitos de desarrollo (`http://localhost` con puertos configurados) y una allowlist de producción suministrada por configuración; nunca wildcard con credenciales. La ruta `/api/v1/` versiona la API. `schema_version: "0.1"` versiona el envelope y no sustituye versiones Quality/Governance/Recommendation. Los request IDs están diferidos en V0.1: no hay campo de respuesta ni middleware.

## OpenAPI, headers and rate limiting

FastAPI mantiene `/docs` y `/openapi.json` disponibles en desarrollo local. En producción/demo su exposición es una decisión de despliegue, no una garantía contractual. Headers mínimos (por ejemplo, content type y nosniff) pertenecen al reverse proxy/FastAPI; CSP y headers de UI pertenecen a Next.js. Rate limiting para despliegues públicos pertenece al proxy/gateway; no se añade Redis, limiter distribuido ni limiter a nivel de aplicación en V0.1.

## Deferred

Async jobs, polling, websockets, streaming, batch, URL/cloud ingestion, storage, connectors, auth, accounts, API keys, billing, history, saved analyses, DB, webhooks, AI endpoints, chat, report/PDF export y custom rule configuration.

## Human decisions for implementation

Las decisiones V0.1 quedan cerradas: body HTTP 6 MiB, timeout objetivo 30 s, OpenAPI habilitado en producción, rate limiting en proxy/gateway y request IDs diferidos. Solo permanecen configurables los workers, memoria y allowlist CORS de producción.
