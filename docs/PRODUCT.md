# Producto

## Problema

Un analista, estudiante o Data Steward recibe un archivo y necesita saber qué contiene, si puede utilizarse con confianza y qué revisar primero. El perfilado técnico no basta; una IA no debe inventar métricas ni conclusiones.

## Usuarios y jobs-to-be-done

- Analista de datos: evaluar un dataset antes de analizarlo.
- Data Steward / governance practitioner: localizar riesgos y huecos de documentación.
- Estudiante o recruiter: demostrar un proceso de calidad explicable.

Tras cargar un archivo, el usuario debe poder inspeccionar el perfil, la evidencia de cada finding y la siguiente acción prioritaria.

## Propuesta de valor y principios

Una primera revisión local, reproducible y orientada a gobernanza. `DETECTED` es un hecho calculado; `INFERRED`, una clasificación con confianza y señales; `SUGGESTED`, una acción vinculada a un finding. Nunca se presentan inferencias como hechos.

## Flujo y MVP

1. Selección de CSV o XLSX permitido.
2. Validación y proceso temporal.
3. Overview, dimensiones y findings ordenados.
4. Evidencia por columna/finding, clasificaciones y diccionario draft.
5. Limpieza de recursos al terminar.

V0.1 abarca un único dataset, profiling determinista, cuatro dimensiones, detección prudente de posibles datos personales, evidencia y recomendaciones. No hay cuentas, persistencia, conectores, histórico, workspaces, RBAC ni pagos.

## Límites, claims y éxito

No es auditoría oficial, legal compliance, BI/ETL, catálogo, lineage ni chat. Permitidos: “automated data profiling”, “data quality heuristic”, “potential personal data”, “potential governance risk” y “suggested data dictionary”. Prohibidos: “GDPR compliant”, “compliance checker”, “auditoría oficial” y “garantiza calidad”.

Éxito: fixtures sintéticos producen resultados repetibles; cada finding tiene evidencia legible; IA no origina números; un usuario identifica una acción P0/P1 sin reglas ocultas.
