import pytest

from app.ingestion.errors import DatasetLimitError, EmptyDatasetError, FileTooLargeError, MalformedDatasetError
from app.ingestion.limits import IngestionLimits
from app.ingestion.service import ingest_dataset


def test_reads_valid_csv() -> None:
    dataset = ingest_dataset(b"id,name\n1,Ada\n2,Lin\n", "valid.csv")
    assert dataset.row_count == 2
    assert dataset.column_names == ("id", "name")
    assert dataset.ingestion_metadata.delimiter == ","


@pytest.mark.parametrize(("content", "delimiter"), [(b"id;name\n1;Ada\n", ";"), (b"id\tname\n1\tAda\n", "\t"), (b"id|name\n1|Ada\n", "|")])
def test_reads_supported_delimiters(content: bytes, delimiter: str) -> None:
    dataset = ingest_dataset(content, "delimited.csv")
    assert dataset.ingestion_metadata.delimiter == delimiter


def test_reads_quoted_delimiter() -> None:
    dataset = ingest_dataset(b'id;note\n1;"north;east"\n', "quoted.csv")
    assert dataset.ingestion_metadata.delimiter == ";"
    assert dataset.dataframe["note"][0] == "north;east"


def test_reads_quoted_multiline_field() -> None:
    dataset = ingest_dataset(b'id;note\n1;"first line\nsecond line"\n', "multiline.csv")
    assert dataset.ingestion_metadata.delimiter == ";"
    assert dataset.row_count == 1
    assert dataset.dataframe["note"][0] == "first line\nsecond line"


def test_reads_utf8_bom() -> None:
    dataset = ingest_dataset("id,name\n1,Ada\n".encode("utf-8-sig"), "utf8_bom.csv")
    assert dataset.column_names == ("id", "name")


def test_rejects_invalid_utf8() -> None:
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"id,name\n1,\xff\n", "invalid_utf8.csv")


def test_rejects_empty_csv() -> None:
    with pytest.raises(EmptyDatasetError):
        ingest_dataset(b"", "empty.csv")


def test_accepts_header_only_csv_with_warning() -> None:
    dataset = ingest_dataset(b"id,name\n", "header_only.csv")
    assert dataset.row_count == 0
    assert dataset.warnings == ("header_only_dataset",)


def test_rejects_duplicate_empty_or_whitespace_headers() -> None:
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"id,id\n1,2\n", "duplicate_columns.csv")
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"id,\n1,2\n", "empty_columns.csv")
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"id,   \n1,2\n", "whitespace_columns.csv")


def test_rejects_inconsistent_csv_rows() -> None:
    with pytest.raises(MalformedDatasetError):
        ingest_dataset(b"id,name\n1,Ada,extra\n", "malformed_rows.csv")


def test_enforces_file_row_and_column_limits() -> None:
    with pytest.raises(FileTooLargeError):
        ingest_dataset(b"id\n1\n", "large.csv", limits=IngestionLimits(max_file_bytes=3))
    with pytest.raises(DatasetLimitError):
        ingest_dataset(b"id\n1\n2\n", "rows.csv", limits=IngestionLimits(max_rows=1))
    with pytest.raises(DatasetLimitError):
        ingest_dataset(b"a,b\n1,2\n", "columns.csv", limits=IngestionLimits(max_columns=1))


def test_filename_is_metadata_not_a_path() -> None:
    dataset = ingest_dataset(b"id\n1\n", "../../not-a-path.csv")
    assert dataset.source_filename == "../../not-a-path.csv"
