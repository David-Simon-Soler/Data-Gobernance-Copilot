# V0.1 stress and benchmark harness

This directory contains a reproducible, non-production harness for measuring the real deterministic analysis pipeline. It exercises ingestion, profiling, quality, governance, recommendations and response serialization without mocks.

## Run

Use a Python environment containing the dependencies declared by `apps/api/pyproject.toml`, then run from the repository root:

```bash
python benchmarks/run_benchmarks.py
```

The harness regenerates every input with seed `20260909`, runs each accepted CSV scenario three times in a fresh subprocess, validates configured boundaries, compares a representative XLSX file, exercises the FastAPI endpoint and performs ten medium analyses in one process.

Large inputs are written to the ignored `benchmarks/generated/` directory. Compact machine-readable and human-readable results are written to:

- `benchmarks/results/latest.json`
- `benchmarks/results/latest.md`

## Measurement semantics

- Durations use `time.perf_counter()`.
- Total pipeline duration includes ingestion, profiling, quality, governance, recommendation generation and safe response serialization.
- Dataset generation time is recorded separately and excluded from pipeline timings.
- Peak process memory uses `resource.getrusage(resource.RUSAGE_SELF).ru_maxrss`.
- Linux reports `ru_maxrss` in KiB. It is a process-lifetime high-water mark, not an instantaneous allocation measurement.
- Fresh subprocesses make per-run high-water marks comparable, but each value includes the Python interpreter, imported libraries, input bytes and result objects.
- Repeated-load current RSS samples come from `/proc/self/status`; they describe this execution only and do not prove absence of leaks in every deployment.

The checked-in results are evidence from one recorded machine, not performance guarantees for other hardware or deployment environments.
