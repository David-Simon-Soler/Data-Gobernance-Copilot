"""Generate deterministic synthetic datasets for the V0.1 benchmark suite."""

from __future__ import annotations

import csv
import json
import random
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Sequence


SEED = 20_260_909
ROOT = Path(__file__).resolve().parent
GENERATED_DIR = ROOT / "generated"

STANDARD_HEADERS = (
    "record_id",
    "email",
    "region",
    "revenue",
    "created_at",
    "status",
    "phone",
    "postal_code",
    "age",
    "department",
    "score",
    "active",
    "category",
    "country",
    "cost",
    "quantity",
    "account_code",
    "segment",
    "updated_at",
    "note",
)

TORTURE_HEADERS = (
    "customer_id",
    "email",
    "phone",
    "postal_code",
    "region",
    "age",
    "revenue",
    "created_at",
    "updated_at",
    "status",
    "country",
    "segment",
    "category",
    "quantity",
    "discount",
    "account_code",
    "free_text",
    "gender",
    "city",
    "active",
)


@dataclass(frozen=True)
class DatasetSpec:
    name: str
    filename: str
    rows: int
    columns: int
    cells: int
    expected: str
    bytes: int
    mib: float
    generation_seconds: float


def _base36(value: int) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"
    output = ""
    while value:
        value, remainder = divmod(value, len(alphabet))
        output = alphabet[remainder] + output
    return output


def _standard_row(index: int, width: int) -> list[str]:
    compact = _base36(index)
    values = [
        compact,
        f"u{_base36(index % 4_096)}@x.test",
        ("n", "s", "e", "w")[index % 4],
        f"{index % 997}.{index % 100:02d}",
        f"2026-{index % 12 + 1:02d}-{index % 28 + 1:02d}",
        ("a", "i", "p")[index % 3],
        f"555{index % 10_000_000:07d}",
        f"{index % 100_000:05d}",
        str(18 + index % 73),
        chr(97 + index % 8),
        str(index % 101),
        ("1", "0")[index % 2],
        chr(97 + index % 6),
        ("ES", "PT", "FR")[index % 3],
        str(index % 701),
        str(index % 9),
        f"a{index % 997:03d}",
        chr(97 + index % 5),
        f"2026-{(index + 3) % 12 + 1:02d}-{(index + 7) % 28 + 1:02d}",
        chr(97 + index % 10),
    ]
    if width <= len(values):
        return values[:width]
    return values + [str((index + column) % 10) for column in range(len(values), width)]


def _compact_row(index: int, width: int) -> list[str]:
    return [_base36(index), *[str((index + column) % 10) for column in range(1, width)]]


def _torture_rows(row_count: int) -> Iterable[Sequence[str]]:
    rng = random.Random(SEED)
    previous: list[str] | None = None
    for index in range(row_count):
        if previous is not None and index % 100 == 0:
            yield list(previous)
            continue

        identifier_index = index - 1 if index and index % 20 == 0 else index
        email = (
            ""
            if index % 8 == 0
            else f"bad-{_base36(index)}"
            if index % 20 == 1
            else f"u{_base36(index % 10_000)}@example.test"
        )
        phone = "" if index % 9 == 0 else "oops" if index % 31 == 0 else f"555{index % 10_000_000:07d}"
        created = (
            "not-a-date"
            if index % 23 == 0
            else f"{index % 28 + 1:02d}/{index % 12 + 1:02d}/2026"
            if index % 3 == 0
            else f"2026-{index % 12 + 1:02d}-{index % 28 + 1:02d}"
        )
        updated = "" if index % 10 == 0 else f"2026-{(index + 1) % 12 + 1:02d}-{(index + 5) % 28 + 1:02d}"
        revenue = "bad" if index % 29 == 0 else f"{index % 997},{index % 100:02d}" if index % 4 == 0 else f"{index % 997}.{index % 100:02d}"
        row = [
            f"c{_base36(identifier_index)}",
            email,
            phone,
            f"{index % 100_000:05d}",
            "" if index % 8 == 0 else rng.choice(("North", "north", "NORTH", "South")),
            "" if index % 11 == 0 else "unknown" if index % 37 == 0 else str(18 + index % 73),
            revenue,
            created,
            updated,
            rng.choice(("active", "Active", "ACTIVE", "inactive")),
            rng.choice(("ES", "PT", "FR")),
            rng.choice(("A", "B", "C", "D")),
            rng.choice(("retail", "Retail", "enterprise", "SMB")),
            str(index % 9),
            f"{index % 30 / 100:.2f}",
            f"acct-{index % 997:03d}",
            "RAW_SENTINEL_DO_NOT_RETURN" if index == 0 else f"note-{index % 100}",
            rng.choice(("F", "M", "X", "")),
            rng.choice(("MAD", "BCN", "LIS", "PAR")),
            rng.choice(("true", "false", "1", "0")),
        ]
        previous = row
        yield row


def _write_csv(
    name: str,
    headers: Sequence[str],
    rows: Iterable[Sequence[str]],
    row_count: int,
    expected: str,
) -> DatasetSpec:
    path = GENERATED_DIR / f"{name.lower()}.csv"
    started = time.perf_counter()
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(headers)
        writer.writerows(rows)
    elapsed = time.perf_counter() - started
    byte_count = path.stat().st_size
    return DatasetSpec(
        name=name,
        filename=path.name,
        rows=row_count,
        columns=len(headers),
        cells=row_count * len(headers),
        expected=expected,
        bytes=byte_count,
        mib=round(byte_count / (1024 * 1024), 4),
        generation_seconds=round(elapsed, 6),
    )


def _write_xlsx(row_count: int = 10_000, width: int = 20) -> DatasetSpec:
    from openpyxl import Workbook

    path = GENERATED_DIR / "medium_representative.xlsx"
    started = time.perf_counter()
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Data"
    worksheet.append(list(STANDARD_HEADERS[:width]))
    for index in range(row_count):
        worksheet.append(_standard_row(index, width))
    workbook.save(path)
    elapsed = time.perf_counter() - started
    byte_count = path.stat().st_size
    return DatasetSpec(
        name="MEDIUM_XLSX",
        filename=path.name,
        rows=row_count,
        columns=width,
        cells=row_count * width,
        expected="accepted",
        bytes=byte_count,
        mib=round(byte_count / (1024 * 1024), 4),
        generation_seconds=round(elapsed, 6),
    )


def generate_all() -> list[DatasetSpec]:
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    scenarios = [
        _write_csv("SMALL_BASELINE", STANDARD_HEADERS[:10], (_standard_row(i, 10) for i in range(1_000)), 1_000, "accepted"),
        _write_csv("MEDIUM_REALISTIC", STANDARD_HEADERS, (_standard_row(i, 20) for i in range(10_000)), 10_000, "accepted"),
        _write_csv("LARGE_REALISTIC", STANDARD_HEADERS, (_standard_row(i, 20) for i in range(50_000)), 50_000, "accepted"),
        _write_csv("ROW_LIMIT", ("record_id", *[f"c{i}" for i in range(1, 10)]), (_compact_row(i, 10) for i in range(100_000)), 100_000, "accepted"),
        _write_csv("TORTURE_MIXED", TORTURE_HEADERS, _torture_rows(41_000), 41_000, "accepted"),
        _write_csv("HIGH_COLUMN", tuple(f"c{i:03d}" for i in range(250)), (_compact_row(i, 250) for i in range(4_000)), 4_000, "accepted"),
        _write_csv("LIMIT_REJECTION_ROWS", ("record_id",), ((_base36(i),) for i in range(100_001)), 100_001, "rejected"),
        _write_csv("LIMIT_REJECTION_COLUMNS", tuple(f"c{i:03d}" for i in range(251)), (tuple("1" for _ in range(251)) for _ in range(1)), 1, "rejected"),
        _write_csv("LIMIT_REJECTION_CELLS", tuple(f"c{i:03d}" for i in range(250)), (_compact_row(i, 250) for i in range(4_001)), 4_001, "rejected"),
        _write_xlsx(),
    ]
    for scenario in scenarios:
        if scenario.expected == "accepted" and scenario.bytes > 5 * 1024 * 1024:
            raise RuntimeError(f"{scenario.name} exceeds the 5 MiB V0.1 limit")
    return scenarios


if __name__ == "__main__":
    print(json.dumps([asdict(item) for item in generate_all()], indent=2))
