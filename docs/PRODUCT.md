# Producto

## Problema

Un analista o Data Steward recibe un archivo y necesita entender su estructura, detectar anomalias medibles y decidir que revisar primero. El perfilado tecnico aislado no ofrece por si solo trazabilidad entre señales, findings y acciones; una interpretacion generada tampoco debe inventar metricas ni conclusiones.

## Propuesta V0.1

Data Governance Copilot ofrece una primera evaluacion reproducible de un CSV o XLSX:

1. valida y normaliza el archivo;
2. perfila estructura y metricas deterministas;
3. calcula calidad estructural con aplicabilidad explicita;
4. presenta governance signals requiring review;
5. enlaza findings con evidence y recomendaciones priorizadas.

`DETECTED` es un hecho calculado, `INFERRED` una clasificacion sustentada por señales e incertidumbre, y `SUGGESTED` una accion propuesta. Las tres capas permanecen separadas.

## Usuarios y resultado esperado

El flujo sirve a analistas de datos, governance practitioners, revisores tecnicos y personas que evaluan el proyecto. Tras analizar un archivo, el usuario puede inspeccionar overview, Quality, Governance, recomendaciones, evidence y el inventario de columnas, y rastrear cada accion hasta su finding fuente.

La demo sintetica muestra que un score estructural agregado alto puede coexistir con duplicados, valores malformed y governance signals que requieren revision humana.

## Alcance y limites

V0.1 analiza un dataset por peticion, de forma stateless y sin persistencia. Incluye CSV/XLSX, profiling determinista, cuatro dimensiones de Quality, clasificaciones prudentes de gobernanza, potential personal data, findings y recomendaciones `P0/P1/P2`.

No es una auditoria oficial, un compliance checker, una opinion legal, un score de riesgo de gobernanza ni una garantia de calidad. No confirma PII o datos personales, no certifica GDPR y no determina si un dataset es seguro o apto para un uso concreto.

Fuera de V0.1: cuentas, autenticacion, base de datos, historial, conectores, lineage, data contracts, workspaces, RBAC, pagos, export, BI/ETL, chat e IA. Cualquier IA futura sera opcional y advisory-only.
