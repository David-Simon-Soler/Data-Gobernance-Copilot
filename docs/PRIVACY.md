# Privacidad y seguridad

## Protecciones implementadas en V0.1

V0.1 procesa un archivo por peticion y sin persistencia de aplicacion por defecto. El pipeline de dominio opera en memoria con limites; el parser multipart de Starlette puede usar un archivo temporal gestionado por el sistema operativo antes de entregar el upload al dominio. La aplicacion no crea, nombra ni conserva ese temporal. No hay base de datos, cuenta, historial ni almacenamiento de resultados. El response de analisis no incluye bytes, DataFrame, raw rows, cell values, samples ni posiciones internas de duplicados.

La politica de logging permite datos operativos minimos, como status, duracion, tamaño, formato y counts agregados. No se deben registrar contenido de celdas, filas, muestras, bytes, paths internos ni excepciones que incorporen datos del archivo. Los errores HTTP implementados son genericos y no exponen trazas o valores.

## Modelo de amenazas V0.1

- **Activos:** contenido del dataset, memoria y filesystem del proceso, disponibilidad, logs, errores, configuracion publica del navegador, cadena de dependencias y secretos del repositorio.
- **Fronteras de confianza:** navegador/Next.js a FastAPI por HTTP directo; multipart a ingestion; CSV/XLSX no confiable a motores deterministas y response tipado; XLSX añade la frontera ZIP/XML.
- **Entradas y adversarios:** uploader con CSV/XLSX, formulas, enlaces, filename o texto hostil; request sobredimensionado; sitio cross-origin; cliente que agota recursos; dependencia comprometida u operador con CORS incorrecto.
- **Mitigado en V0.1:** formatos y limites cerrados, lectura acotada, preinspeccion ZIP, formulas sin evaluar, enlaces externos deshabilitados, errores genericos, renderizado React sin HTML crudo, CORS allowlist, rate limit y admision locales al proceso, y ausencia de persistencia de aplicacion.
- **Parcialmente mitigado:** CPU/memoria dentro de los caps, parsing XML, spooling temporal gestionado por el framework y riesgo de supply chain siguen dependiendo de librerias y del entorno local.
- **Responsabilidad de despliegue:** TLS, limites y slow-upload timeout en proxy, rate limit por cliente/distribuido, hard timeout, aislamiento de workers, controles de abuso, observabilidad y origenes CORS exactos siguen siendo obligatorios antes de exponer la API a Internet.
- Este modelo no es una certificacion ni una garantia formal de seguridad.

## Formatos y controles de archivo

Solo se aceptan CSV y XLSX; `.xls`, `.xlsm` y otros formatos se rechazan. Filename y MIME son metadata no confiable y el filename nunca construye un path.

Los limites implementados son 5 MiB por archivo, 6 MiB para el body multipart HTTP, 100.000 filas, 250 columnas, 20 hojas, 1.000.000 de celdas, 2.000 entradas ZIP y 20 MiB descomprimidos para XLSX. CSV exige UTF-8 o UTF-8 BOM y un delimitador no ambiguo entre comma, semicolon, tab y pipe.

XLSX se preinspecciona como ZIP, se abre con openpyxl en `read_only=True`, `data_only=False` y `keep_links=False`. Las formulas no se ejecutan: se detectan por tipo de celda, se convierten a valor no disponible y generan el warning `formulas_not_evaluated`. Al usar `data_only=False`, un cached formula result nunca entra al DataFrame como dato fiable. Macros y enlaces externos no se habilitan.

## Browser y API

El navegador envia el archivo al FastAPI configurado; el procesamiento no ocurre enteramente en el navegador. El frontend mantiene el resultado solo como estado efimero, no usa local/session storage y no renderiza HTML arbitrario. Raw rows no vuelven en `AnalysisResponse`.

CORS usa una allowlist configurable. La receta local permite `http://localhost:3000` y llama a `http://127.0.0.1:8000`; un origen distinto no recibe permiso CORS.

## Controles necesarios para Internet

Las protecciones anteriores, incluido el rate limit y la concurrencia acotada locales a cada proceso, permiten evaluar una demo publica controlada. No hacen segura por si sola una API publica sin restricciones. Un despliegue en Internet todavia debe proporcionar:

- rate limiting por cliente en proxy/plataforma y controles de abuso;
- aislamiento de CPU/memoria y dimensionado conservador de procesos;
- hard timeouts en hosting, proxy y proceso, ademas del timeout de respuesta de la aplicacion;
- limites de request tambien en el reverse proxy;
- CORS especifico del despliegue;
- monitorizacion operativa, alertas y respuesta a incidentes.

V0.1 no implementa esos controles de plataforma ni afirma estar preparado para exposicion publica sin ellos. Los limites locales no se comparten entre instancias; la aplicación no analiza `X-Forwarded-For` y depende de la configuración de proxies de confianza del ASGI server para resolver la identidad del cliente. Consulta [DEPLOYMENT.md](DEPLOYMENT.md).

## IA diferida

No se usa IA en V0.1. Si se incorpora un proveedor futuro, debera existir consentimiento y disclosure claros sobre los datos que salen del entorno. La frontera evidence-first impide que una salida generada cree o modifique facts, metrics, scores, evidence o clasificaciones canonicas.
