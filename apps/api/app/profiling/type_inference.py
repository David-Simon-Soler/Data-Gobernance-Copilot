import math
import re
from datetime import date, datetime
from typing import Any

from .models import PrimitiveType

_INTEGER = re.compile(r"^[+-]?(0|[1-9][0-9]*)$")
_FLOAT = re.compile(r"^[+-]?(0|[1-9][0-9]*)\.[0-9]+$")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATETIME = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$")


def infer_primitive_type(values: list[Any]) -> PrimitiveType:
    if not values:
        return PrimitiveType.NULL
    if all(isinstance(value, bool) for value in values):
        return PrimitiveType.BOOLEAN
    if all(isinstance(value, int) and not isinstance(value, bool) for value in values):
        return PrimitiveType.INTEGER
    if all(_is_finite_number(value) for value in values):
        return PrimitiveType.FLOAT
    if all(isinstance(value, datetime) for value in values):
        return PrimitiveType.DATETIME
    if all(isinstance(value, date) and not isinstance(value, datetime) for value in values):
        return PrimitiveType.DATE
    if not all(isinstance(value, str) for value in values):
        return PrimitiveType.STRING

    strings = values
    if _has_consistent_leading_zero_codes(strings):
        return PrimitiveType.STRING
    if all(value.casefold() in {"true", "false"} for value in strings):
        return PrimitiveType.BOOLEAN
    if all(_INTEGER.fullmatch(value) for value in strings):
        return PrimitiveType.INTEGER
    if all(_FLOAT.fullmatch(value) for value in strings):
        return PrimitiveType.FLOAT
    if all(_is_iso_datetime(value) for value in strings):
        return PrimitiveType.DATETIME
    if all(_is_iso_date(value) for value in strings):
        return PrimitiveType.DATE
    return PrimitiveType.STRING


def _has_consistent_leading_zero_codes(values: list[str]) -> bool:
    return all(len(value) > 1 and value.isascii() and value.isdigit() and value.startswith("0") for value in values)


def _is_finite_number(value: object) -> bool:
    return isinstance(value, float) and math.isfinite(value)


def _is_iso_date(value: str) -> bool:
    if not _DATE.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _is_iso_datetime(value: str) -> bool:
    if not _DATETIME.fullmatch(value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True
