# Controlled public deployment

This document covers a small, controlled public demo of Data Governance Copilot V0.1. It does not define an unrestricted production SaaS deployment.

## Deployment decision

The selected public-demo topology is:

```text
Browser
  -> Vercel Next.js project (apps/web)
  -> direct HTTPS
  -> Koyeb FastAPI Web Service (apps/api, eco-small, Frankfurt)
  -> deterministic in-process analysis pipeline
```

The primary backend target is a Koyeb `eco-small` instance in Frankfurt: 0.5 vCPU, 1 GB RAM and a published full-month price of USD 5.36 before tax and network extras. The secondary provider fallback is Railway Hobby in its EU West (Amsterdam) region. This is a deployment decision, not a claim that either service has already been created.

Koyeb Free is not the primary target. Although it is a persistent free option for hobby use, its 512 MB and 0.1 vCPU allocation is too close to this application's measured resource envelope to promise reliable analysis across the complete V0.1 input range. The paid `eco-small` tier materially improves both memory and CPU while remaining close to the project's low-cost objective.

Provider facts and prices below were checked against official documentation on 2026-09-10. They must be rechecked before provisioning because provider plans can change.

## Provider comparison

| Criterion | Render | Railway | Koyeb |
|---|---|---|---|
| Free/current cost | Persistent Free web service; 750 running instance-hours per workspace/month | Free is USD 0 with USD 1/month of resources after a one-time USD 5/30-day trial | One persistent Free Web Service per organization |
| Free resources | 0.1 CPU, 512 MB | Up to 1 vCPU and 0.5 GB after trial | 0.1 vCPU, 512 MB, 2 GB SSD |
| Relevant paid entry | 0.5 CPU/512 MB at USD 7/month; the next memory step is 1 CPU/2 GB at USD 25/month | Hobby has a USD 5 minimum including USD 5 usage, then usage-based overage | `eco-small`: 0.5 vCPU/1 GB at USD 5.36/month if continuously active |
| Memory suitability | Free and USD 7 tiers: **tight**; 2 GB tier: comfortable | Free: **tight**; Hobby can use more memory but cost is usage-based | Free: **tight**; `eco-small`: suitable starting headroom |
| CPU suitability | Free 0.1 CPU is weak for near-limit Polars/openpyxl work; paid 0.5 CPU is better but keeps 512 MB | Free advertises up to 1 vCPU, but its tiny monthly resource allowance is a reliability risk; Hobby has the strongest elastic path | Free 0.1 vCPU is weak; `eco-small` 0.5 vCPU is the best low fixed-price balance |
| HTTP/runtime limits | Web-service responses up to 100 minutes; no lower provider limit conflicts with the app's 30-second wait | Request body upload within 5 minutes; 5 minutes without transfer and up to 15 minutes while transferring | Edge HTTP connection timeout 100 seconds |
| Documented request-body cap | No relevant public cap found; retain the application's 6 MiB body limit and validate the edge during deployment | Upload-duration constraint is documented; retain the application's 6 MiB body limit | No relevant public cap found; retain the application's 6 MiB body limit and validate the edge during deployment |
| Sleep/cold start | Free sleeps after 15 minutes; Render documents about one minute to spin up | Optional Serverless sleeps after outbound inactivity; first request can be delayed or return 502 | Free sleeps after one hour; documented deep-sleep cold start is typically 1–5 seconds. Paid scale-to-zero behavior depends on plan/instance configuration |
| Runtime/deploy support | Native Python and Docker; Git auto-deploy; monorepo root directory | Railpack/container or Docker; GitHub deployment; monorepo root directory | Buildpacks or Docker; GitHub auto-deploy; monorepo work directory |
| HTTPS/service URL | Managed TLS and `onrender.com` URL | Generated `up.railway.app` HTTPS domain | Managed TLS and generated `koyeb.app` URL |
| Environment/health/logs | Dashboard variables, HTTP health check, deploy/runtime logs | Variables, deploy-time HTTP health check, build/deploy/HTTP logs and resource metrics | Variables, HTTP/TCP health checks, build/runtime logs, CPU/RAM/request metrics |
| Preferred EU location | Frankfurt | Amsterdam (not Frankfurt) | Frankfurt |
| Free quota/card risk | No card required; service can be suspended when included usage is exhausted; free tier has no SLA | No card for Free; USD 1 recurring resources is easy to exhaust. Card required for Hobby | Valid payment card required even for Starter/Free; only one Free instance per organization |
| Controlled-demo fit | Simple, but the long and frequent Free cold start is poor portfolio UX | Good paid fallback; free quota is operationally fragile | **Best fit on `eco-small`**; Free is only a constrained validation option |
| Production SaaS fit | Only a paid, sized service plus additional controls | Paid plans provide a strong upgrade path | Paid instances provide a clear upgrade path, but V0.1 still lacks SaaS controls |

Official references:

- Render: [pricing and compute](https://render.com/pricing), [Free limitations](https://render.com/docs/free), [regions](https://render.com/docs/regions), [web services](https://render.com/docs/web-services), [request duration](https://render.com/docs/render-vs-vercel-comparison), [health checks](https://render.com/docs/health-checks) and [monorepos](https://render.com/docs/monorepo-support).
- Railway: [pricing](https://docs.railway.com/pricing), [plan comparison](https://railway.com/pricing), [public-network limits](https://docs.railway.com/networking/public-networking/specs-and-limits), [regions](https://docs.railway.com/deployments/regions), [health checks](https://docs.railway.com/deployments/healthchecks), [logs](https://docs.railway.com/observability/logs), [metrics](https://docs.railway.com/observability/metrics) and [Serverless behavior](https://docs.railway.com/deployments/serverless).
- Koyeb: [instances and prices](https://www.koyeb.com/docs/reference/instances), [pricing/card requirements](https://www.koyeb.com/docs/faqs/pricing), [regions](https://www.koyeb.com/docs/reference/regions), [scale to zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero), [edge limits and TLS](https://www.koyeb.com/docs/reference/edge-network), [GitHub deployment](https://www.koyeb.com/docs/build-and-deploy/deploy-with-git), [monorepos](https://www.koyeb.com/docs/build-and-deploy/monorepo), [environment and `PORT`](https://www.koyeb.com/docs/build-and-deploy/environment-variables), [health checks](https://www.koyeb.com/docs/run-and-scale/health-checks) and [metrics](https://www.koyeb.com/docs/run-and-scale/metrics).

## Memory and concurrency decision

Phase 10.9.1 measured roughly 200–230 MiB process RSS for representative large accepted work. The Phase 10.9.2 three-client admission test reached about 270 MiB while one analysis ran and other bounded multipart requests were rejected. A nominal 512 MiB limit therefore leaves only about 242 MiB above the observed 270 MiB peak (about 47% of the advertised limit), not a guaranteed 282 MiB safety margin based only on the 230 MiB figure.

**512 MiB is classified as TIGHT.** The recorded process RSS already includes the running Python process for the measured path, but it does not prove a universal maximum across Python/Polars/openpyxl versions, allocator fragmentation, a different libc/container, cold imports, multipart spooling, XLSX shapes or provider CPU throttling. Advertised MB and effective cgroup accounting can also differ, and a second worker or simultaneous parser can consume the remaining margin. The 0.1-vCPU free tiers also create timeout risk: near-limit CSV took about 3.6 seconds on the validation machine and a representative XLSX was about four times slower than equivalent CSV, so that local timing cannot be projected safely onto a heavily throttled shared CPU.

For this reason the selected 1 GB tier must still start with exactly one Uvicorn process and `DATA_GOV_MAX_CONCURRENT_ANALYSES=1`. Do not increase process count or application concurrency until deployed CSV and XLSX boundary smokes plus provider memory graphs demonstrate headroom. A 512 MiB free instance may be used to validate deployment mechanics or small demo fixtures, but it is not the approved capacity for the full V0.1 contract.

## Exact project configuration

### Frontend: Vercel

- Status: **GO** for a controlled public demo.
- Git branch: `main`.
- Root directory: `apps/web`.
- Framework preset: Next.js.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Node.js: select Vercel's Node 24.x runtime, matching the release validation major; npm follows the platform runtime.
- Output: framework default `.next`; no custom output setting.
- Required production environment variable: `NEXT_PUBLIC_API_BASE_URL=https://<koyeb-app>.koyeb.app`.

`NEXT_PUBLIC_API_BASE_URL` is intentionally public and embedded at build time, so changing it requires a new frontend deployment. The application needs no server-side database, storage or session. English/Spanish selection and analysis rendering are client-side. No `vercel.json` is required because Vercel detects the existing Next.js project and the dashboard root/build settings are sufficient.

### Backend: Koyeb

- Status: **GO** on `eco-small`, subject to the live deployment validation in the next phase.
- Git branch: `main`.
- Service type: Web Service using the GitHub source and buildpack builder.
- Work directory: `apps/api`.
- Region: Frankfurt (`fra`).
- Instance: one `eco-small` instance (0.5 vCPU, 1 GB).
- Build command: `python -m pip install .`.
- Run command: `python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"`.
- Exposed port: one HTTP port; Koyeb defines `PORT` from the lowest exposed port when it is not set explicitly.
- HTTP health check: `GET /health`.
- No volume, database, worker, queue or additional replica.

The module path is verified from `apps/api/app/main.py`, which creates `app`, and `uvicorn` is a declared runtime dependency in `apps/api/pyproject.toml`. The service must not hardcode port 8000.

## Environment contract

### Required in public deployment

| Component | Variable | Value |
|---|---|---|
| Vercel frontend | `NEXT_PUBLIC_API_BASE_URL` | Exact public Koyeb HTTPS origin; no path, query, fragment or credentials |
| Koyeb backend | `DATA_GOV_CORS_ORIGINS` | Exact stable Vercel production origin; comma-separate only if another deliberate frontend origin is approved |

### Optional backend overrides with safe application defaults

| Variable | Default | Initial public-demo value |
|---|---:|---:|
| `DATA_GOV_RATE_LIMIT_ENABLED` | `true` | `true` |
| `DATA_GOV_RATE_LIMIT_BURST` | `5` | `5` |
| `DATA_GOV_RATE_LIMIT_REFILL_SECONDS` | `12` | `12` |
| `DATA_GOV_RATE_LIMIT_MAX_CLIENTS` | `10000` | `10000` |
| `DATA_GOV_MAX_CONCURRENT_ANALYSES` | `1` | `1` |
| `DATA_GOV_ADMISSION_WAIT_SECONDS` | `0.1` | `0.1` |
| `DATA_GOV_ANALYSIS_TIMEOUT_SECONDS` | `30` | `30` |

The optional values may be left unset because these are the code defaults. Setting them explicitly in Koyeb makes the initial operational posture visible. `PORT` is platform-provided, not an application setting. None of these values is a secret.

### Local only

- Frontend examples may use `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`.
- Backend examples may use `DATA_GOV_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`.

Never carry the local CORS values into the public service. The generated provider HTTPS domains are sufficient for V0.1; no custom domain is required.

## Deployment order and CORS bootstrap

The next phase should use this order without a wildcard:

1. Create the Koyeb Web Service from `main` with root `apps/api`, the commands above and `DATA_GOV_CORS_ORIGINS=https://bootstrap.invalid`. This reserved, non-routable origin makes browser access fail closed while the real frontend origin is unknown.
2. Confirm the generated `https://<app>-<org>-<hash>.koyeb.app` URL, `/health`, deployment logs and instance metrics. Do not advertise it yet.
3. Create/import the Vercel project with root `apps/web`; set production `NEXT_PUBLIC_API_BASE_URL` to the exact Koyeb HTTPS origin before the successful production build.
4. Confirm the stable Vercel production origin `https://<project>.vercel.app` rather than using a commit-specific preview URL.
5. Replace the backend bootstrap origin with that exact Vercel production origin in `DATA_GOV_CORS_ORIGINS` and redeploy Koyeb.
6. Rebuild/redeploy Vercel if its backend variable changed, then verify allowed production CORS and a deliberately disallowed origin.
7. Run `/health`, real CSV and XLSX smokes, admission/rate-limit checks and browser critical-path E2E before publishing the URL.

If the Vercel production origin later changes, update backend CORS and redeploy the backend before treating the new origin as live. `*` is never an acceptable bootstrap or production value.

No `Dockerfile`, `Procfile`, `render.yaml`, Railway configuration, Koyeb configuration or `vercel.json` is added in this phase. The selected services support the two monorepo roots and explicit dashboard commands directly; adding provider-specific files before the first live validation would add configuration without demonstrated need.

## Architecture and trust boundaries

The browser calls FastAPI directly:

```text
Browser -> Next.js / -> direct HTTPS -> FastAPI /api/v1/analyze
                                      -> FastAPI /health
```

There is no Next.js API proxy, authentication, account, database, persistence, queue, AI service or background analysis job. The application processes one uploaded CSV/XLSX per request and does not return raw rows. Starlette may spool multipart data to an OS-managed temporary file; the application does not create or retain an upload store.

The practical public-demo threats are repeated large uploads, concurrent CPU-heavy analysis, memory amplification, slow uploads, malformed multipart and datasets, cross-origin browser calls, repeated rejected files and accidental unrestricted use of the API.

## Required configuration

Copy the repository examples as a reference, but set real values in the deployment environment.

| Variable | Default | Production guidance |
|---|---:|---|
| `NEXT_PUBLIC_API_BASE_URL` | local development fallback only | Required before `npm run build`; use the public FastAPI HTTPS origin |
| `DATA_GOV_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated exact frontend origins, for example `https://<frontend-domain>` |
| `DATA_GOV_RATE_LIMIT_ENABLED` | `true` | Keep enabled for a public demo |
| `DATA_GOV_RATE_LIMIT_BURST` | `5` | Initial tokens available per direct peer |
| `DATA_GOV_RATE_LIMIT_REFILL_SECONDS` | `12` | Seconds required to refill one token |
| `DATA_GOV_RATE_LIMIT_MAX_CLIENTS` | `10000` | Maximum in-memory peer buckets per process |
| `DATA_GOV_MAX_CONCURRENT_ANALYSES` | `1` | Keep at one until instance memory is measured |
| `DATA_GOV_ADMISSION_WAIT_SECONDS` | `0.1` | Short bounded admission wait; there is no unbounded queue |
| `DATA_GOV_ANALYSIS_TIMEOUT_SECONDS` | `30` | Response wait limit, not a CPU hard kill |

`NEXT_PUBLIC_API_BASE_URL` is a public build-time value embedded in the client bundle. A production build fails clearly if it is absent. It must be an absolute HTTP(S) origin without credentials, path, query or fragment. Local development retains the `http://localhost:8000` fallback.

Malformed, wildcard, credential-bearing or path-bearing CORS entries are ignored. If no valid entry remains, browser cross-origin access fails closed. CORS credentials are disabled; only `GET`, `POST` and the `Content-Type` request header are allowed.

## Rate limiting

`POST /api/v1/analyze` uses a bounded in-memory token bucket per direct ASGI peer address. The default allows a burst of five requests and then refills one request every 12 seconds. A rejection returns HTTP 429 with code `rate_limit_exceeded` and a `Retry-After` header. The limiter executes before reading the request body.

The application reads the client address from the ASGI scope and never parses `X-Forwarded-For` itself. Uvicorn or another ASGI server may resolve that address from forwarded headers only according to its trusted-proxy configuration. Restrict trusted proxy IPs; never enable arbitrary forwarded-header trust on an Internet-reachable server. Every public deployment should also configure a platform/gateway limiter using verified platform client semantics.

Buckets and counters are local to one Python process. Multiple workers or instances do not share limits. This mechanism is suitable only as defense in depth for a controlled single-instance demo.

## Admission control and timeout

After FastAPI's bounded multipart parsing and before copying the upload or running the domain pipeline, the endpoint waits at most the configured admission interval for a semaphore permit. With the default of one concurrent analysis:

- the admitted request runs the synchronous pipeline in a thread so the ASGI event loop remains responsive;
- a saturated request returns HTTP 503 with code `analysis_capacity_exceeded` and does not enter an unbounded application queue;
- success, parser/analysis exceptions and cancellation release the permit safely;
- a response timeout returns HTTP 503 with code `analysis_timeout`.

Python cannot safely terminate arbitrary synchronous CPU work in a thread. If the response timeout expires, the thread continues until it exits and retains its permit; capacity is not falsely advertised. Configure a hard worker/request timeout and termination policy in the hosting platform or reverse proxy. Client disconnects likewise do not guarantee immediate CPU termination.

## Request and process sizing

Application limits remain:

- 5 MiB uploaded file;
- 6 MiB complete multipart HTTP body;
- 100,000 rows, 250 columns and 1,000,000 cells;
- 20 XLSX sheets, 2,000 ZIP entries and 20 MiB uncompressed XLSX content.

Set the upstream body limit to at least 6 MiB so valid multipart requests can reach FastAPI, but do not make it materially larger. Configure the proxy/platform to reject oversized and excessively slow uploads before they consume application resources.

Phase 10.9.1 measured a worst representative CSV median near 3.6 seconds and roughly 200–230 MiB process RSS for large accepted work on the validation machine. The Phase 10.9.2 three-client admission check peaked at about 270 MiB while one analysis ran and other bounded multipart requests were rejected. Memory scales with concurrent parsing, analyses and worker processes. For a small demo instance, start with one Uvicorn worker and `DATA_GOV_MAX_CONCURRENT_ANALYSES=1`; measure the target host before increasing either. This is evidence-based starting guidance, not a universal sizing guarantee.

## Headers, TLS and errors

FastAPI and Next.js return:

- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `X-Frame-Options: DENY`;
- `Content-Security-Policy: frame-ancestors 'none'`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

TLS termination, HTTPS redirects and HSTS belong to the deployment platform because the applications cannot safely infer the public transport topology. Do not enable HSTS until the public domain and HTTPS behavior are correct.

Rate-limit, saturation and timeout responses use stable codes and generic messages. Existing malformed-file and unexpected-error handling remains generic: no traceback, local path, raw row, cell value or filename is returned. Production logging must remain operational and aggregate; do not log uploaded bytes or dataset content.

## Health and platform protections

`GET /health` remains unchanged and returns exactly:

```json
{"status":"ok"}
```

It is a liveness check, not proof that an analysis permit is currently available. A public deployment still needs:

- TLS and a narrowly configured reverse proxy or platform edge;
- verified per-client rate limiting and abuse controls;
- upstream body-size and slow-upload limits;
- hard worker/request timeouts and memory/CPU isolation;
- conservative process counts and restart policy;
- monitoring, alerting and incident response;
- exact production CORS origins;
- dependency and image patching.

Horizontal scaling requires a distributed admission/rate-limit design or platform-level equivalents. V0.1 has no identity, quota, audit log, durable job or tenant isolation, so it is not an unrestricted multi-tenant SaaS boundary.

## Application and platform responsibilities

| Application protections already present | Platform responsibilities and remaining gaps |
|---|---|
| 5 MiB file and 6 MiB complete-body limits | TLS termination, generated HTTPS URL and transport policy |
| CSV/XLSX structural, row, column, cell and archive limits | Container/microVM memory and CPU isolation, restart policy and deployment rollback |
| In-process token-bucket limiter before body reading | A verified edge/client rate limit remains desirable; Koyeb's service concurrency ceiling is not an abuse-control substitute |
| One-analysis semaphore, bounded admission and generic 503 responses | Observe CPU/RAM saturation and keep one instance/process until measured |
| 30-second response wait with permit retained while timed-out work finishes | A provider-side hard execution kill is not established by the reviewed Koyeb docs; an uncooperative worker may require instance restart |
| Exact, fail-closed CORS parsing with credentials disabled | Preserve the exact Vercel origin in service configuration; do not use wildcard CORS |
| Generic safe errors and no raw rows in API responses | Edge/body and slow-upload controls are not documented as configurable on the selected tier, so the application limit remains the primary control |
| No application persistence or dataset-content logging | Ephemeral runtime, deployment/build logs, access control to the provider account and dependency/image patching |

Koyeb provides TLS, health probes, isolated instance resources, logs and metrics. It does not turn this application into an authenticated or quota-enforced service. The direct public API URL remains discoverable, and the local per-process limiter is not a distributed security boundary. These are accepted residual risks only for a low-traffic, controlled portfolio demo.

## Selected-provider failure modes

The selected paid instance is not treated as an SLA:

- **Memory limit exceeded:** the process or instance can be killed/restarted; an in-flight browser analysis will fail with a network or 5xx response. Inspect memory metrics and logs, keep concurrency at one, and move to a larger instance if observed peaks approach the limit.
- **Sleep/cold start:** `eco-small` is not being selected on the assumption that it will sleep. If Koyeb Free is used temporarily, it scales to zero after one idle hour and the first request can incur the documented 1–5 second deep-sleep start. This is acceptable for a portfolio preview but must be explained in QA and not mistaken for analysis time.
- **CPU contention/throttling:** analysis latency can increase and the application's 30-second response wait can return safe `analysis_timeout`; the underlying thread may continue until completion. Repeated timeouts require a larger CPU tier, not more workers.
- **Free quota or billing failure:** the primary paid instance is usage-billed through a card. A failed payment or provider account restriction can pause service; a temporary Free validation instance is limited to one per organization. The frontend will show its existing API-unavailable state.
- **Provider restart:** local filesystem state and in-flight work are lost. This does not lose application records because the product has no persistence, but the user must retry the upload.
- **Failed deployment or health check:** the new deployment must not be promoted until `/health` passes; review build/runtime logs and keep or roll back to the prior healthy deployment.
- **Regional/provider outage:** the API is unavailable and the frontend cannot analyze. The documented fallback is a separately configured Railway Hobby service, followed by a frontend rebuild and exact CORS update—not an automatic failover.

## Initial observability

No external paid telemetry is required for the first release. During deployment and after any change:

1. Check Koyeb deployment/instance status and the `/health` response.
2. Review build and runtime logs without adding dataset values, filenames or uploaded bytes.
3. Watch Koyeb CPU, memory, response-time, throughput and transfer graphs during CSV/XLSX boundary smokes.
4. Observe HTTP 429, 503 and 5xx responses using provider/browser network information; correlate them with safe application codes and runtime logs.
5. Review Vercel build/deployment status and browser console/network errors after frontend releases.
6. Treat repeated restarts, memory near the instance ceiling, near-30-second analyses or sustained 429/503 responses as an upgrade/review trigger.

## Go/no-go decision

- **Vercel frontend: GO** for the existing Next.js application.
- **Koyeb `eco-small` backend: GO** for deployment validation with one process and one concurrent analysis.
- **Controlled public demo: GO** only after the next phase passes live health, CSV/XLSX, CORS, timeout/admission, security-header and browser checks. Until then no public deployment is claimed.
- **Unrestricted production SaaS: NO-GO.** Authentication, durable quotas, tenant isolation, distributed rate/admission controls, stronger edge abuse/body controls, operational alerting and a production capacity/SLA plan remain out of scope.

## Deployment checklist

1. Build Next.js with the final HTTPS `NEXT_PUBLIC_API_BASE_URL`.
2. Set only exact HTTPS frontend origins in `DATA_GOV_CORS_ORIGINS`.
3. Keep the application limiter and one-analysis admission default enabled.
4. Start with one API worker and allocate memory above the measured peak with headroom.
5. Configure platform body, slow-upload, rate, hard-timeout and resource-isolation controls.
6. Terminate TLS at the platform and verify all security response headers.
7. Verify `/health`, a normal CSV/XLSX analysis, safe 429/503 behavior and disallowed CORS.
8. Confirm logs contain no dataset values, filenames, raw exceptions or local paths.
9. Run backend/frontend suites and dependency audits against the deployed revision.
10. Do not describe the deployment as compliant, legally conclusive or safe for unrestricted SaaS use.
