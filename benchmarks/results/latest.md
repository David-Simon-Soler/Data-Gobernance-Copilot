# Latest V0.1 stress and benchmark results

Generated: 2026-09-09T10:23:00.167557+00:00

These figures describe one local run on the recorded environment. They are not deployment guarantees.

## Environment

- Python: 3.13.15
- CPU: 12th Gen Intel(R) Core(TM) i5-12450H (12 logical CPUs)
- RAM: 15.241 GiB
- Platform: Linux-7.2.3-arch1-2-x86_64-with-glibc2.42

## Dataset matrix

| Dataset | Rows | Columns | Cells | Size MiB | Expected | Result |
|---|---:|---:|---:|---:|---|---|
| SMALL_BASELINE | 1,000 | 10 | 10,000 | 0.0552 | accepted | accepted |
| MEDIUM_REALISTIC | 10,000 | 20 | 200,000 | 0.9071 | accepted | accepted |
| LARGE_REALISTIC | 50,000 | 20 | 1,000,000 | 4.5465 | accepted | accepted |
| ROW_LIMIT | 100,000 | 10 | 1,000,000 | 2.1477 | accepted | accepted |
| TORTURE_MIXED | 41,000 | 20 | 820,000 | 4.9207 | accepted | accepted |
| HIGH_COLUMN | 4,000 | 250 | 1,000,000 | 1.9149 | accepted | accepted |
| LIMIT_REJECTION_ROWS | 100,001 | 1 | 100,001 | 0.4311 | rejected | rejected |
| LIMIT_REJECTION_COLUMNS | 1 | 251 | 251 | 0.0017 | rejected | rejected |
| LIMIT_REJECTION_CELLS | 4,001 | 250 | 1,000,250 | 1.9154 | rejected | rejected |
| MEDIUM_XLSX | 10,000 | 20 | 200,000 | 0.9464 | accepted | accepted |

## Direct pipeline performance

| Dataset | Total min s | Total median s | Total max s | Peak RSS MiB | Findings | Recommendations |
|---|---:|---:|---:|---:|---:|---:|
| SMALL_BASELINE | 0.052564 | 0.058439 | 0.074029 | 95.645 | 24 | 7 |
| MEDIUM_REALISTIC | 0.793024 | 0.794856 | 0.803675 | 114.977 | 35 | 8 |
| LARGE_REALISTIC | 3.442453 | 3.601728 | 3.792631 | 212.176 | 36 | 8 |
| ROW_LIMIT | 1.927924 | 2.191700 | 2.214277 | 214.883 | 3 | 1 |
| TORTURE_MIXED | 3.232702 | 3.304390 | 3.370372 | 204.328 | 33 | 10 |
| HIGH_COLUMN | 1.958044 | 2.142223 | 2.170750 | 171.711 | 1 | 0 |

Each CSV scenario has three measured runs in a fresh subprocess. Total time includes ingestion, profiling, quality, governance, recommendation generation and response serialization.

## Determinism and limits

- Stable fingerprints: True.
- Accepted limit checks: {"1000000_cells": true, "100000_rows": true, "250_columns": true}.
- Rejections: {"LIMIT_REJECTION_CELLS": {"error_code": "dataset_limit_exceeded", "error_type": "DatasetLimitError"}, "LIMIT_REJECTION_COLUMNS": {"error_code": "dataset_limit_exceeded", "error_type": "DatasetLimitError"}, "LIMIT_REJECTION_ROWS": {"error_code": "dataset_limit_exceeded", "error_type": "DatasetLimitError"}}.

## XLSX comparison

- Scenario: MEDIUM_XLSX (10,000 × 20).
- Equivalent CSV median: 0.794856 s.
- XLSX total: 3.125198 s.
- Time ratio: 3.932×.
- XLSX peak RSS: 110.812 MiB.

## API path

- SMALL_BASELINE: HTTP 200, 0.104296 s, direct fingerprint parity True, raw rows exposed False.
- ROW_LIMIT: HTTP 200, 1.876422 s, direct fingerprint parity True, raw rows exposed False.
- TORTURE_MIXED: HTTP 200, 3.476541 s, direct fingerprint parity True, raw rows exposed False.

## Repeated load

- Sequence: 10 MEDIUM_REALISTIC analyses in one process.
- Current RSS: 75.461 MiB initially; 115.457 MiB finally.
- Samples: [75.461, 111.629, 113.215, 114.309, 113.637, 107.328, 112.906, 112.004, 108.582, 110.543, 115.457].
- Fingerprints stable: True.
- The samples describe observed process RSS only; they do not prove that every deployment is leak-free.

## Measurement caveats

- Timing uses time.perf_counter().
- Per-run peak memory uses resource.getrusage(RUSAGE_SELF).ru_maxrss.
- On Linux, ru_maxrss is reported in KiB and is a process-lifetime high-water mark.
- Each measured direct run uses a fresh subprocess, so high-water marks are comparable but include interpreter and imported-library baseline memory.
- Dataset generation time is excluded from analysis timing.

## Conclusions

- All valid CSV scenarios, including three distinct 1,000,000-cell shapes, completed without crashes and produced stable fingerprints across three fresh-process runs.
- The exact 100,000-row, 250-column and 1,000,000-cell boundaries were accepted; each corresponding over-limit fixture was rejected with dataset_limit_exceeded.
- The representative 200,000-cell XLSX took 3.932 times the equivalent CSV median; generation time was excluded from analysis timing.
- Across ten medium analyses in one process, current RSS rose after the first run and then fluctuated rather than growing monotonically; this observation is not proof that every deployment is leak-free.
- The highest observed API-path peak RSS was 233.207 MiB, so public concurrency and resource controls still require deployment-level validation.

## Review classification

- Rating: GOOD
- Reason: On this machine, every valid CSV shape completed with a median at or below 3.602 seconds (LARGE_REALISTIC) at the hard V0.1 limits, fingerprints were stable, and no crash or monotonically growing repeated-load RSS trend was observed. Concurrent public traffic was not tested.
- Safest public claim: On one Python 3.13.15 / Intel i5-12450H system, the tested CSV datasets up to the V0.1 1,000,000-cell limit completed in at most 3.602 seconds median across three runs; this is a local measurement, not a deployment guarantee.
