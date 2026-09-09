# Controlled public deployment

This document covers a small, controlled public demo of Data Governance Copilot V0.1. It does not define an unrestricted production SaaS deployment.

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
