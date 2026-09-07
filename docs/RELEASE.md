# Release y ejecución local

## Baseline comprobada

La instalación se validó desde un archivo limpio de `HEAD`, sin reutilizar `.venv` ni `node_modules` del working tree.

- Backend: Python 3.12.14 y 3.13.15; pip 25.0.1 y 26.2.1 respectivamente; uvicorn 0.52.4; httpx2 2.12.0; pytest 8.4.2. El paquete distinto `httpx` no forma parte del entorno declarado.
- Frontend: Node.js 24.19.0, npm 11.17.0, Next.js 15.5.25, React 19.2.8, Vitest 3.2.6, Vite 6.4.3, esbuild 0.25.12 y PostCSS 8.5.28.
- Python 3.11 y Node.js 22 LTS no estaban instalados en el entorno de validación; el proyecto declara Python `>=3.11`, pero esta ejecución no afirma haber probado esas dos versiones concretas.

## Instalación y validación

Backend:

```sh
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
python -m pytest
```

Frontend:

```sh
cd apps/web
npm ci
npm run lint
npm test
npm run typecheck
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build
npm audit
npm audit --omit=dev
```

`pip install -e ".[dev]"` instala exclusivamente los rangos declarados en `apps/api/pyproject.toml`. `npm ci` exige y respeta `apps/web/package-lock.json` sin actualizarlo.

## Ejecución canónica

Terminal 1:

```sh
cd apps/api
source .venv/bin/activate
export DATA_GOV_CORS_ORIGINS=http://localhost:3000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2, usando el build creado con la misma URL pública:

```sh
cd apps/web
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npm run build
npm run start
```

Comprueba `http://localhost:3000` y:

```sh
curl http://127.0.0.1:8000/health
```

La respuesta de salud debe ser exactamente `{"status":"ok"}`. No se requieren secretos. Los archivos `.env.example` solo documentan valores; la receta exporta explícitamente el valor backend porque la aplicación no carga archivos dotenv por sí sola.

## Demo sintética

En la landing, selecciona **Try synthetic demo** y analiza el archivo preseleccionado. La respuesta canónica usa `customer-operations-sample.xlsx`, sheet `Customer Operations`, 50 filas y 13 columnas. Debe producir overall quality `99`, observed completeness `98.46`, dimensiones `100.0 / 98.4 / 99.67 / 96.66`, 2 quality findings, 19 governance classifications, 19 governance findings y 8 recommendations. Más contexto en [SYNTHETIC_DEMO.md](SYNTHETIC_DEMO.md).

## CORS y troubleshooting

El navegador considera `http://localhost:3000` y `http://127.0.0.1:3000` orígenes distintos. Si abres el frontend con uno, `DATA_GOV_CORS_ORIGINS` debe incluir exactamente ese origen (varios valores se separan por comas) y debes reiniciar FastAPI tras cambiarlo. La URL API pública debe definirse antes del build porque Next.js la incorpora al bundle del cliente.

Con un origen no permitido, FastAPI sigue operativo y responde a `/health`, pero omite `Access-Control-Allow-Origin`; el navegador bloquea la lectura de la respuesta y la interfaz muestra el error seguro de servicio inaccesible sin filtrar detalles internos. Revisa también que ambos procesos estén activos y que los puertos 3000/8000 estén libres.
