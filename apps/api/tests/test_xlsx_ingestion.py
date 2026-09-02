from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from openpyxl import Workbook

from app.ingestion.errors import DatasetLimitError, EmptyDatasetError, MalformedDatasetError, SheetNotFoundError, UnsupportedFormatError
from app.ingestion.limits import IngestionLimits
from app.ingestion.service import ingest_dataset


def test_reads_valid_xlsx(xlsx_bytes) -> None:
    content = xlsx_bytes({"Customers": [["id", "name"], [1, "Ada"]]})
    dataset = ingest_dataset(content, "valid.xlsx")
    assert dataset.sheet_name == "Customers"
    assert dataset.row_count == 1
    assert dataset.column_names == ("id", "name")


def test_uses_first_visible_non_empty_sheet_and_allows_selection(xlsx_bytes) -> None:
    content = xlsx_bytes({"First": [["id"], [1]], "Second": [["name"], ["Ada"]]})
    assert ingest_dataset(content, "multiple_sheets.xlsx").sheet_name == "First"
    selected = ingest_dataset(content, "multiple_sheets.xlsx", sheet_name="Second")
    assert selected.column_names == ("name",)


def test_skips_hidden_first_sheet() -> None:
    workbook = Workbook()
    hidden = workbook.active
    hidden.title = "Hidden"
    hidden.append(["secret"])
    hidden.sheet_state = "hidden"
    visible = workbook.create_sheet("Visible")
    visible.append(["id"])
    visible.append([1])
    output = BytesIO()
    workbook.save(output)
    assert ingest_dataset(output.getvalue(), "hidden.xlsx").sheet_name == "Visible"


def test_rejects_missing_or_empty_sheet(xlsx_bytes) -> None:
    content = xlsx_bytes({"Only": [["id"], [1]]})
    with pytest.raises(SheetNotFoundError):
        ingest_dataset(content, "multiple_sheets.xlsx", sheet_name="Missing")
    empty = xlsx_bytes({"Empty": []})
    with pytest.raises(EmptyDatasetError):
        ingest_dataset(empty, "empty_sheet.xlsx")


def test_rejects_when_all_visible_sheets_are_empty(xlsx_bytes) -> None:
    with pytest.raises(EmptyDatasetError):
        ingest_dataset(xlsx_bytes({"One": [], "Two": []}), "all_empty.xlsx")


def test_formulas_are_not_evaluated(xlsx_bytes) -> None:
    content = xlsx_bytes({"Formula": [["id", "total", "name"], [1, "=1+1", "Ada"]]})
    dataset = ingest_dataset(content, "formulas.xlsx")
    assert dataset.ingestion_metadata.formula_cell_count == 1
    assert "formulas_not_evaluated" in dataset.warnings
    assert dataset.dataframe["total"][0] is None
    assert dataset.dataframe["name"][0] == "Ada"


def test_rejects_corrupt_workbook() -> None:
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"not an xlsx", "corrupt.xlsx")


def test_enforces_sheet_and_cell_limits(xlsx_bytes) -> None:
    content = xlsx_bytes({"One": [["id"], [1]], "Two": [["id"], [2]]})
    with pytest.raises(DatasetLimitError):
        ingest_dataset(content, "sheets.xlsx", limits=IngestionLimits(max_sheets=1))
    cells = xlsx_bytes({"Data": [["a", "b"], [1, 2], [3, 4]]})
    with pytest.raises(DatasetLimitError):
        ingest_dataset(cells, "cells.xlsx", limits=IngestionLimits(max_total_cells=4))


def test_rejects_limit_before_default_sheet_scan(xlsx_bytes) -> None:
    oversized = xlsx_bytes({"Oversized": [["a", "b"], [1, 2]]})
    with pytest.raises(DatasetLimitError):
        ingest_dataset(oversized, "oversized.xlsx", limits=IngestionLimits(max_total_cells=3))


def test_enforces_zip_entry_and_expansion_limits() -> None:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr("one.txt", "1")
        archive.writestr("two.txt", "2")
    with pytest.raises(DatasetLimitError):
        ingest_dataset(output.getvalue(), "entries.xlsx", limits=IngestionLimits(max_zip_entries=1))

    expanded = BytesIO()
    with ZipFile(expanded, "w", ZIP_DEFLATED) as archive:
        archive.writestr("large.txt", "x" * 100)
    with pytest.raises(DatasetLimitError):
        ingest_dataset(expanded.getvalue(), "expanded.xlsx", limits=IngestionLimits(max_zip_uncompressed_bytes=10))


def test_rejects_unsupported_office_formats() -> None:
    with pytest.raises(UnsupportedFormatError):
        ingest_dataset(b"anything", "legacy.xls")
    with pytest.raises(UnsupportedFormatError):
        ingest_dataset(b"anything", "macro.xlsm")
