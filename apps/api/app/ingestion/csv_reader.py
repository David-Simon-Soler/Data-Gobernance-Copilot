import csv
from io import StringIO

import polars as pl

from .errors import DatasetLimitError, EmptyDatasetError, MalformedDatasetError
from .limits import IngestionLimits

_DELIMITERS = (",", ";", "\t", "|")
_DELIMITER_SAMPLE_RECORDS = 20


def read_csv(content: bytes, limits: IngestionLimits) -> tuple[pl.DataFrame, tuple[str, ...], str, tuple[str, ...]]:
    if not content:
        raise EmptyDatasetError("CSV contains no bytes")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise MalformedDatasetError("CSV must use UTF-8 encoding") from error
    if not text.strip():
        raise EmptyDatasetError("CSV contains no records")

    delimiter = _detect_delimiter(text)
    try:
        reader = csv.reader(StringIO(text, newline=""), delimiter=delimiter, strict=True)
        headers = tuple(next(reader))
    except StopIteration as error:
        raise EmptyDatasetError("CSV has no header") from error
    except csv.Error as error:
        raise MalformedDatasetError("CSV parsing failed") from error
    _validate_headers(headers, limits)

    data_rows: list[list[str]] = []
    expected_width = len(headers)
    cell_count = 0
    try:
        for row in reader:
            if len(row) != expected_width:
                raise MalformedDatasetError("CSV rows have inconsistent column counts")
            if len(data_rows) >= limits.max_rows:
                raise DatasetLimitError("CSV row limit exceeded")
            cell_count += expected_width
            if cell_count > limits.max_total_cells:
                raise DatasetLimitError("CSV cell limit exceeded")
            data_rows.append(row)
    except csv.Error as error:
        raise MalformedDatasetError("CSV parsing failed") from error

    warnings = ("header_only_dataset",) if not data_rows else ()
    dataframe = pl.DataFrame(data_rows, schema=list(headers), orient="row", strict=False)
    return dataframe, headers, delimiter, warnings


def _detect_delimiter(text: str) -> str:
    candidates: list[tuple[int, str]] = []
    for delimiter in _DELIMITERS:
        try:
            reader = csv.reader(StringIO(text, newline=""), delimiter=delimiter, strict=True)
            widths: set[int] = set()
            for index, row in enumerate(reader):
                if index >= _DELIMITER_SAMPLE_RECORDS:
                    break
                if row:
                    widths.add(len(row))
            if len(widths) == 1:
                candidates.append((next(iter(widths)), delimiter))
        except csv.Error:
            continue
    multi_column = [candidate for candidate in candidates if candidate[0] > 1]
    if not multi_column:
        return ","
    widest = max(width for width, _ in multi_column)
    winners = [delimiter for width, delimiter in multi_column if width == widest]
    if len(winners) != 1:
        raise MalformedDatasetError("CSV delimiter is ambiguous")
    return winners[0]


def _validate_headers(headers: tuple[str, ...], limits: IngestionLimits) -> None:
    if not headers:
        raise EmptyDatasetError("CSV has no header")
    if len(headers) > limits.max_columns:
        raise DatasetLimitError("CSV column limit exceeded")
    if any(not header.strip() for header in headers):
        raise MalformedDatasetError("CSV contains empty column names")
    if len(set(headers)) != len(headers):
        raise MalformedDatasetError("CSV contains duplicate column names")
