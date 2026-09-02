from pathlib import PurePath

from .csv_reader import read_csv
from .errors import FileTooLargeError, UnsupportedFormatError
from .limits import DEFAULT_LIMITS, IngestionLimits
from .models import IngestedDataset, IngestionMetadata, SourceFormat
from .xlsx_reader import read_xlsx


def ingest_dataset(
    content: bytes,
    source_filename: str,
    *,
    sheet_name: str | None = None,
    limits: IngestionLimits = DEFAULT_LIMITS,
) -> IngestedDataset:
    """Parse untrusted upload bytes without creating filesystem paths."""
    if len(content) > limits.max_file_bytes:
        raise FileTooLargeError("Dataset exceeds configured file size limit")
    suffix = PurePath(source_filename).suffix.lower()
    if suffix == ".csv":
        dataframe, columns, delimiter, warnings = read_csv(content, limits)
        return IngestedDataset(
            source_filename=source_filename,
            source_format=SourceFormat.CSV,
            sheet_name=None,
            row_count=dataframe.height,
            column_count=dataframe.width,
            column_names=columns,
            dataframe=dataframe,
            warnings=warnings,
            ingestion_metadata=IngestionMetadata(delimiter=delimiter),
        )
    if suffix == ".xlsx":
        dataframe, columns, selected_sheet, warnings, formula_count = read_xlsx(content, limits, sheet_name)
        return IngestedDataset(
            source_filename=source_filename,
            source_format=SourceFormat.XLSX,
            sheet_name=selected_sheet,
            row_count=dataframe.height,
            column_count=dataframe.width,
            column_names=columns,
            dataframe=dataframe,
            warnings=warnings,
            ingestion_metadata=IngestionMetadata(formula_cell_count=formula_count),
        )
    raise UnsupportedFormatError("Only CSV and XLSX files are supported")
