from datetime import date, datetime, timezone

import polars as pl

from .models import BasicStatistics, PrimitiveType


def calculate_statistics(series: pl.Series, primitive_type: PrimitiveType) -> BasicStatistics | None:
    non_null = series.drop_nulls()
    if non_null.is_empty():
        return None
    if primitive_type in {PrimitiveType.INTEGER, PrimitiveType.FLOAT}:
        numeric = non_null.cast(pl.Float64)
        return BasicStatistics(minimum=non_null.min(), maximum=non_null.max(), mean=float(numeric.mean()), median=float(numeric.median()), stddev=float(numeric.std(ddof=0)))
    if primitive_type is PrimitiveType.DATE:
        values = [_as_date(value) for value in non_null.to_list()]
        return BasicStatistics(minimum=min(values), maximum=max(values))
    if primitive_type is PrimitiveType.DATETIME:
        values = [_as_datetime(value) for value in non_null.to_list()]
        return BasicStatistics(minimum=min(values), maximum=max(values))
    if primitive_type is PrimitiveType.STRING:
        if series.dtype.is_numeric():
            return None
        lengths = non_null.cast(pl.String).str.len_chars()
        return BasicStatistics(min_length=int(lengths.min()), max_length=int(lengths.max()), average_length=float(lengths.mean()))
    return None


def _as_date(value: object) -> date:
    return value if isinstance(value, date) and not isinstance(value, datetime) else date.fromisoformat(str(value))


def _as_datetime(value: object) -> datetime:
    parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed
