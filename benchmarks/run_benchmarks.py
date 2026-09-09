"""Run reproducible end-to-end benchmarks against the real V0.1 pipeline."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import platform
import resource
import statistics
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = ROOT.parent
API_ROOT = REPOSITORY_ROOT / "apps" / "api"
GENERATED_DIR = ROOT / "generated"
RESULTS_DIR = ROOT / "results"
RUNS = 3
RAW_SENTINEL = "RAW_SENTINEL_DO_NOT_RETURN"
ACCEPTED_CSV = (
    "SMALL_BASELINE",
    "MEDIUM_REALISTIC",
    "LARGE_REALISTIC",
    "ROW_LIMIT",
    "TORTURE_MIXED",
    "HIGH_COLUMN",
)
REJECTIONS = (
    "LIMIT_REJECTION_ROWS",
    "LIMIT_REJECTION_COLUMNS",
    "LIMIT_REJECTION_CELLS",
)
API_SCENARIOS = ("SMALL_BASELINE", "ROW_LIMIT", "TORTURE_MIXED")


def _load_api() -> None:
    api_root = str(API_ROOT)
    if api_root not in sys.path:
        sys.path.insert(0, api_root)


def _fingerprint(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()
    return hashlib.sha256(encoded).hexdigest()


def _assert_safe(payload: dict[str, Any], expected_rows: int, expected_columns: int) -> None:
    metadata = payload["metadata"]
    if metadata["row_count"] != expected_rows or metadata["column_count"] != expected_columns:
        raise AssertionError(
            f"metadata mismatch: expected {expected_rows}x{expected_columns}, "
            f"received {metadata['row_count']}x{metadata['column_count']}"
        )

    forbidden_keys = {"dataframe", "rows", "raw_rows", "records"}
    pending: list[Any] = [payload]
    while pending:
        current = pending.pop()
        if isinstance(current, dict):
            overlap = forbidden_keys.intersection(current)
            if overlap:
                raise AssertionError(f"raw-data-shaped response keys found: {sorted(overlap)}")
            pending.extend(current.values())
        elif isinstance(current, list):
            pending.extend(current)

    serialized = json.dumps(payload, sort_keys=True)
    if RAW_SENTINEL in serialized:
        raise AssertionError("raw sentinel leaked into analysis response")


def _finding_count(payload: dict[str, Any]) -> int:
    analysis = payload["analysis"]
    return sum(
        len(analysis[section].get("findings", []))
        for section in ("profiling", "quality", "governance")
    )


def _recommendation_count(payload: dict[str, Any]) -> int:
    return len(payload["analysis"]["recommendations"].get("recommendations", []))


def _current_rss_kib() -> int:
    with Path("/proc/self/status").open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    raise RuntimeError("VmRSS is unavailable")


def _pipeline_worker(path: Path, rows: int, columns: int) -> dict[str, Any]:
    _load_api()
    import app.analysis.service as service

    content = path.read_bytes()
    ingest_durations: list[float] = []
    original_ingest = service.ingest_dataset

    def timed_ingest(*args: Any, **kwargs: Any) -> Any:
        started = time.perf_counter()
        try:
            return original_ingest(*args, **kwargs)
        finally:
            ingest_durations.append(time.perf_counter() - started)

    service.ingest_dataset = timed_ingest
    started = time.perf_counter()
    try:
        response = service.analyze_dataset(content, path.name)
    finally:
        service.ingest_dataset = original_ingest
    total = time.perf_counter() - started
    if len(ingest_durations) != 1:
        raise AssertionError(f"expected one ingestion call, observed {len(ingest_durations)}")

    payload = response.model_dump(mode="json")
    _assert_safe(payload, rows, columns)
    ingest = ingest_durations[0]
    return {
        "ingest_seconds": round(ingest, 6),
        "analysis_seconds": round(total - ingest, 6),
        "total_seconds": round(total, 6),
        "peak_rss_kib": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 3),
        "fingerprint": _fingerprint(payload),
        "findings": _finding_count(payload),
        "recommendations": _recommendation_count(payload),
        "raw_rows_exposed": False,
    }


def _rejection_worker(path: Path) -> dict[str, Any]:
    _load_api()
    from app.ingestion import ingest_dataset
    from app.ingestion.errors import IngestionError

    content = path.read_bytes()
    started = time.perf_counter()
    try:
        ingest_dataset(content, path.name)
    except IngestionError as error:
        return {
            "rejected": True,
            "error_type": type(error).__name__,
            "error_code": error.code,
            "seconds": round(time.perf_counter() - started, 6),
            "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 3),
        }
    raise AssertionError(f"{path.name} was unexpectedly accepted")


def _api_worker(path: Path, rows: int, columns: int) -> dict[str, Any]:
    _load_api()
    from fastapi.testclient import TestClient
    from app.main import app

    content = path.read_bytes()
    started = time.perf_counter()
    response = TestClient(app).post(
        "/api/v1/analyze",
        files={"file": (path.name, content, "application/octet-stream")},
    )
    elapsed = time.perf_counter() - started
    payload = response.json()
    if response.status_code != 200:
        raise AssertionError(f"API returned HTTP {response.status_code}: {payload}")
    _assert_safe(payload, rows, columns)
    return {
        "http_status": response.status_code,
        "seconds": round(elapsed, 6),
        "fingerprint": _fingerprint(payload),
        "findings": _finding_count(payload),
        "recommendations": _recommendation_count(payload),
        "raw_rows_exposed": False,
        "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 3),
    }


def _repeated_worker(path: Path, rows: int, columns: int, count: int) -> dict[str, Any]:
    _load_api()
    from app.analysis import analyze_dataset

    content = path.read_bytes()
    initial = _current_rss_kib()
    current_samples = [initial]
    peak_samples = [resource.getrusage(resource.RUSAGE_SELF).ru_maxrss]
    fingerprints: list[str] = []
    durations: list[float] = []
    for _ in range(count):
        started = time.perf_counter()
        response = analyze_dataset(content, path.name)
        durations.append(round(time.perf_counter() - started, 6))
        payload = response.model_dump(mode="json")
        _assert_safe(payload, rows, columns)
        fingerprints.append(_fingerprint(payload))
        del response, payload
        gc.collect()
        current_samples.append(_current_rss_kib())
        peak_samples.append(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    return {
        "count": count,
        "initial_rss_kib": initial,
        "initial_rss_mib": round(initial / 1024, 3),
        "final_rss_kib": current_samples[-1],
        "final_rss_mib": round(current_samples[-1] / 1024, 3),
        "rss_samples_mib": [round(value / 1024, 3) for value in current_samples],
        "peak_samples_mib": [round(value / 1024, 3) for value in peak_samples],
        "durations_seconds": durations,
        "fingerprints_stable": len(set(fingerprints)) == 1,
    }


def _invoke_worker(mode: str, path: Path, rows: int = 0, columns: int = 0, count: int = 0) -> dict[str, Any]:
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--worker",
        mode,
        "--path",
        str(path),
        "--rows",
        str(rows),
        "--columns",
        str(columns),
        "--count",
        str(count),
    ]
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(completed.stdout)


def _summary(runs: list[dict[str, Any]]) -> dict[str, Any]:
    def values(name: str) -> list[float]:
        return [float(run[name]) for run in runs]

    totals = values("total_seconds")
    return {
        "runs": len(runs),
        "ingest_min_seconds": min(values("ingest_seconds")),
        "ingest_median_seconds": statistics.median(values("ingest_seconds")),
        "ingest_max_seconds": max(values("ingest_seconds")),
        "analysis_min_seconds": min(values("analysis_seconds")),
        "analysis_median_seconds": statistics.median(values("analysis_seconds")),
        "analysis_max_seconds": max(values("analysis_seconds")),
        "total_min_seconds": min(totals),
        "total_median_seconds": statistics.median(totals),
        "total_max_seconds": max(totals),
        "peak_rss_mib": max(float(run["peak_rss_mib"]) for run in runs),
        "findings": runs[0]["findings"],
        "recommendations": runs[0]["recommendations"],
        "fingerprint": runs[0]["fingerprint"],
        "fingerprints_stable": len({run["fingerprint"] for run in runs}) == 1,
    }


def _environment() -> dict[str, Any]:
    cpu = "unknown"
    with Path("/proc/cpuinfo").open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("model name"):
                cpu = line.split(":", 1)[1].strip()
                break
    ram_kib = 0
    with Path("/proc/meminfo").open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("MemTotal:"):
                ram_kib = int(line.split()[1])
                break
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "kernel": f"{platform.system()} {platform.release()} {platform.version()} {platform.machine()}",
        "cpu": cpu,
        "logical_cpus": os.cpu_count(),
        "ram_total_kib": ram_kib,
        "ram_total_gib": round(ram_kib / 1024 / 1024, 3),
    }


def _format_markdown(results: dict[str, Any]) -> str:
    lines = [
        "# Latest V0.1 stress and benchmark results",
        "",
        f"Generated: {results['generated_at_utc']}",
        "",
        "These figures describe one local run on the recorded environment. They are not deployment guarantees.",
        "",
        "## Environment",
        "",
        f"- Python: {results['environment']['python']}",
        f"- CPU: {results['environment']['cpu']} ({results['environment']['logical_cpus']} logical CPUs)",
        f"- RAM: {results['environment']['ram_total_gib']} GiB",
        f"- Platform: {results['environment']['platform']}",
        "",
        "## Dataset matrix",
        "",
        "| Dataset | Rows | Columns | Cells | Size MiB | Expected | Result |",
        "|---|---:|---:|---:|---:|---|---|",
    ]
    rejection_names = {item["name"] for item in results["rejections"]}
    for item in results["datasets"]:
        result = "rejected" if item["name"] in rejection_names else item["expected"]
        lines.append(
            f"| {item['name']} | {item['rows']:,} | {item['columns']:,} | "
            f"{item['cells']:,} | {item['mib']:.4f} | {item['expected']} | {result} |"
        )

    lines.extend(
        [
            "",
            "## Direct pipeline performance",
            "",
            "| Dataset | Total min s | Total median s | Total max s | Peak RSS MiB | Findings | Recommendations |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for name, item in results["summaries"].items():
        lines.append(
            f"| {name} | {item['total_min_seconds']:.6f} | {item['total_median_seconds']:.6f} | "
            f"{item['total_max_seconds']:.6f} | {item['peak_rss_mib']:.3f} | "
            f"{item['findings']} | {item['recommendations']} |"
        )

    lines.extend(
        [
            "",
            "Each CSV scenario has three measured runs in a fresh subprocess. Total time includes ingestion, profiling, quality, governance, recommendation generation and response serialization.",
            "",
            "## Determinism and limits",
            "",
            f"- Stable fingerprints: {results['determinism']['all_stable']}.",
            f"- Accepted limit checks: {json.dumps(results['limits']['accepted'], sort_keys=True)}.",
            f"- Rejections: {json.dumps(results['limits']['rejected'], sort_keys=True)}.",
            "",
            "## XLSX comparison",
            "",
            f"- Scenario: {results['xlsx']['name']} ({results['xlsx']['rows']:,} × {results['xlsx']['columns']}).",
            f"- Equivalent CSV median: {results['xlsx']['csv_median_seconds']:.6f} s.",
            f"- XLSX total: {results['xlsx']['xlsx_total_seconds']:.6f} s.",
            f"- Time ratio: {results['xlsx']['time_ratio']:.3f}×.",
            f"- XLSX peak RSS: {results['xlsx']['peak_rss_mib']:.3f} MiB.",
            "",
            "## API path",
            "",
        ]
    )
    for name, item in results["api"].items():
        lines.append(
            f"- {name}: HTTP {item['http_status']}, {item['seconds']:.6f} s, "
            f"direct fingerprint parity {item['fingerprint_parity']}, raw rows exposed {item['raw_rows_exposed']}."
        )

    repeated = results["repeated_load"]
    lines.extend(
        [
            "",
            "## Repeated load",
            "",
            f"- Sequence: {repeated['count']} MEDIUM_REALISTIC analyses in one process.",
            f"- Current RSS: {repeated['initial_rss_mib']:.3f} MiB initially; {repeated['final_rss_mib']:.3f} MiB finally.",
            f"- Samples: {repeated['rss_samples_mib']}.",
            f"- Fingerprints stable: {repeated['fingerprints_stable']}.",
            "- The samples describe observed process RSS only; they do not prove that every deployment is leak-free.",
            "",
            "## Measurement caveats",
            "",
            "- Timing uses time.perf_counter().",
            "- Per-run peak memory uses resource.getrusage(RUSAGE_SELF).ru_maxrss.",
            "- On Linux, ru_maxrss is reported in KiB and is a process-lifetime high-water mark.",
            "- Each measured direct run uses a fresh subprocess, so high-water marks are comparable but include interpreter and imported-library baseline memory.",
            "- Dataset generation time is excluded from analysis timing.",
            "",
            "## Conclusions",
            "",
            *(f"- {conclusion}" for conclusion in results["conclusions"]),
            "",
            "## Review classification",
            "",
            f"- Rating: {results['classification']['rating']}",
            f"- Reason: {results['classification']['reason']}",
            f"- Safest public claim: {results['public_claim']}",
            "",
        ]
    )
    return "\n".join(lines)


def run() -> dict[str, Any]:
    from generate_datasets import generate_all

    specifications = [item.__dict__ for item in generate_all()]
    by_name = {item["name"]: item for item in specifications}

    runs: dict[str, list[dict[str, Any]]] = {}
    summaries: dict[str, dict[str, Any]] = {}
    for name in ACCEPTED_CSV:
        spec = by_name[name]
        path = GENERATED_DIR / spec["filename"]
        measured = [_invoke_worker("pipeline", path, spec["rows"], spec["columns"]) for _ in range(RUNS)]
        runs[name] = measured
        summaries[name] = _summary(measured)
        if not summaries[name]["fingerprints_stable"]:
            raise AssertionError(f"{name} produced differing fingerprints")

    rejections = []
    for name in REJECTIONS:
        spec = by_name[name]
        rejected = _invoke_worker("rejection", GENERATED_DIR / spec["filename"])
        if not rejected["rejected"] or rejected["error_code"] != "dataset_limit_exceeded":
            raise AssertionError(f"{name} did not produce the canonical dataset limit error")
        rejections.append({"name": name, **rejected})

    xlsx_spec = by_name["MEDIUM_XLSX"]
    xlsx_run = _invoke_worker(
        "pipeline",
        GENERATED_DIR / xlsx_spec["filename"],
        xlsx_spec["rows"],
        xlsx_spec["columns"],
    )

    api_results: dict[str, dict[str, Any]] = {}
    for name in API_SCENARIOS:
        spec = by_name[name]
        api_run = _invoke_worker("api", GENERATED_DIR / spec["filename"], spec["rows"], spec["columns"])
        api_run["fingerprint_parity"] = api_run["fingerprint"] == summaries[name]["fingerprint"]
        if not api_run["fingerprint_parity"]:
            raise AssertionError(f"{name} API response differs from direct pipeline output")
        api_results[name] = api_run

    medium = by_name["MEDIUM_REALISTIC"]
    repeated = _invoke_worker(
        "repeated",
        GENERATED_DIR / medium["filename"],
        medium["rows"],
        medium["columns"],
        10,
    )
    if not repeated["fingerprints_stable"]:
        raise AssertionError("repeated-load fingerprints differ")

    limits = {
        "accepted": {
            "100000_rows": by_name["ROW_LIMIT"]["rows"] == 100_000,
            "250_columns": by_name["HIGH_COLUMN"]["columns"] == 250,
            "1000000_cells": all(
                summaries[name]["fingerprints_stable"]
                for name in ("LARGE_REALISTIC", "ROW_LIMIT", "HIGH_COLUMN")
            ),
        },
        "rejected": {
            item["name"]: {
                "error_type": item["error_type"],
                "error_code": item["error_code"],
            }
            for item in rejections
        },
    }

    csv_median = summaries["MEDIUM_REALISTIC"]["total_median_seconds"]
    results = {
        "schema_version": "0.1",
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "environment": _environment(),
        "methodology": {
            "seed": 20_260_909,
            "measured_runs_per_csv": RUNS,
            "timing": "time.perf_counter",
            "memory": "resource.getrusage(RUSAGE_SELF).ru_maxrss on Linux",
            "pipeline": "app.analysis.service.analyze_dataset with timed ingestion wrapper",
            "warmup_runs": 0,
        },
        "datasets": specifications,
        "runs": runs,
        "summaries": summaries,
        "determinism": {
            "all_stable": all(item["fingerprints_stable"] for item in summaries.values()),
            "repeated_runs_per_csv": RUNS,
            "differing_fields": [],
        },
        "rejections": rejections,
        "limits": limits,
        "xlsx": {
            "name": "MEDIUM_XLSX",
            "rows": xlsx_spec["rows"],
            "columns": xlsx_spec["columns"],
            "cells": xlsx_spec["cells"],
            "bytes": xlsx_spec["bytes"],
            "mib": xlsx_spec["mib"],
            "generation_seconds": xlsx_spec["generation_seconds"],
            "csv_median_seconds": csv_median,
            "xlsx_total_seconds": xlsx_run["total_seconds"],
            "time_ratio": round(xlsx_run["total_seconds"] / csv_median, 3),
            "peak_rss_mib": xlsx_run["peak_rss_mib"],
            "fingerprint": xlsx_run["fingerprint"],
            "findings": xlsx_run["findings"],
            "recommendations": xlsx_run["recommendations"],
        },
        "api": api_results,
        "repeated_load": repeated,
        "conclusions": [
            "Pending review of the recorded measurements and deployment context.",
        ],
        "classification": {
            "rating": "PENDING_REVIEW",
            "reason": "Set after reviewing the recorded measurements and deployment context.",
        },
        "public_claim": "Pending review of measured results.",
    }
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "latest.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    (RESULTS_DIR / "latest.md").write_text(_format_markdown(results), encoding="utf-8")
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", choices=("pipeline", "rejection", "api", "repeated"))
    parser.add_argument("--path", type=Path)
    parser.add_argument("--rows", type=int, default=0)
    parser.add_argument("--columns", type=int, default=0)
    parser.add_argument("--count", type=int, default=0)
    args = parser.parse_args()

    if args.worker:
        if args.path is None:
            parser.error("--path is required in worker mode")
        if args.worker == "pipeline":
            result = _pipeline_worker(args.path, args.rows, args.columns)
        elif args.worker == "rejection":
            result = _rejection_worker(args.path)
        elif args.worker == "api":
            result = _api_worker(args.path, args.rows, args.columns)
        else:
            result = _repeated_worker(args.path, args.rows, args.columns, args.count)
        print(json.dumps(result))
        return

    result = run()
    print(json.dumps({
        "summaries": result["summaries"],
        "xlsx": result["xlsx"],
        "api": result["api"],
        "repeated_load": result["repeated_load"],
        "limits": result["limits"],
    }, indent=2))


if __name__ == "__main__":
    main()
