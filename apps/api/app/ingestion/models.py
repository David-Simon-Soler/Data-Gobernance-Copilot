from dataclasses import dataclass
from enum import StrEnum

import polars as pl


class SourceFormat(StrEnum):
    CSV = "csv"
    XLSX = "xlsx"


@dataclass(frozen=True, slots=True)
class IngestionMetadata:
    delimiter: str | None = None
    formula_cell_count: int = 0


@dataclass(frozen=True, slots=True)
class IngestedDataset:
    source_filename: str
    source_format: SourceFormat
    sheet_name: str | None
    row_count: int
    column_count: int
    column_names: tuple[str, ...]
    dataframe: pl.DataFrame
    warnings: tuple[str, ...]
    ingestion_metadata: IngestionMetadata
