from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class IngestionLimits:
    max_file_bytes: int = 5 * 1024 * 1024
    max_rows: int = 100_000
    max_columns: int = 250
    max_sheets: int = 20
    max_total_cells: int = 1_000_000
    max_zip_uncompressed_bytes: int = 20 * 1024 * 1024
    max_zip_entries: int = 2_000


DEFAULT_LIMITS = IngestionLimits()
