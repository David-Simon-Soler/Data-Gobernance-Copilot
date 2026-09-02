class IngestionError(Exception):
    """Base error with a safe, stable code for later HTTP mapping."""

    code = "ingestion_error"


class UnsupportedFormatError(IngestionError):
    code = "unsupported_format"


class FileTooLargeError(IngestionError):
    code = "file_too_large"


class DatasetLimitError(IngestionError):
    code = "dataset_limit_exceeded"


class MalformedDatasetError(IngestionError):
    code = "malformed_dataset"


class EmptyDatasetError(IngestionError):
    code = "empty_dataset"


class SheetNotFoundError(IngestionError):
    code = "sheet_not_found"
