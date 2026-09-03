from collections import Counter
from datetime import date, datetime
from typing import Any

from .models import PrimitiveType, QualityColumnSignals
from .type_inference import _FLOAT, _INTEGER, _is_finite_number, _is_iso_date, _is_iso_datetime

_TYPED = (PrimitiveType.BOOLEAN, PrimitiveType.INTEGER, PrimitiveType.FLOAT, PrimitiveType.DATE, PrimitiveType.DATETIME)


def collect_quality_signals(values: list[Any]) -> QualityColumnSignals:
    tokens = [value.strip() if isinstance(value, str) else value for value in values]
    if not tokens:
        return QualityColumnSignals(PrimitiveType.NULL, 0, 0, 0, (), False)
    primitive = _select_type(tokens)
    if primitive is PrimitiveType.STRING:
        return QualityColumnSignals(primitive, len(tokens), 0, 0, (), _has_recognized_family(tokens))
    valid = [token for token in tokens if _is_valid(token, primitive)]
    families = Counter(_family(token, primitive) for token in valid)
    return QualityColumnSignals(primitive, len(tokens), len(tokens) - len(valid), len(valid), tuple(sorted(families.items())), bool(families))


def _select_type(tokens: list[Any]) -> PrimitiveType:
    if _has_leading_zero_protection(tokens):
        return PrimitiveType.STRING
    for primitive in _TYPED:
        if sum(_is_valid(token, primitive) for token in tokens) / len(tokens) >= 0.98:
            return primitive
    return PrimitiveType.STRING


def _has_leading_zero_protection(tokens: list[Any]) -> bool:
    eligible = [token for token in tokens if isinstance(token, str)]
    if not eligible:
        return False
    matching = sum(len(token) > 1 and token.isascii() and token.isdigit() and token.startswith("0") for token in eligible)
    return matching * 100 >= len(eligible) * 95


def _is_valid(value: Any, primitive: PrimitiveType) -> bool:
    if primitive is PrimitiveType.BOOLEAN:
        return isinstance(value, bool) or isinstance(value, str) and value.casefold() in {"true", "false", "yes", "no"}
    if primitive is PrimitiveType.INTEGER:
        return isinstance(value, int) and not isinstance(value, bool) or isinstance(value, str) and bool(_INTEGER.fullmatch(value))
    if primitive is PrimitiveType.FLOAT:
        return _is_finite_number(value) or isinstance(value, str) and bool(_FLOAT.fullmatch(value))
    if primitive is PrimitiveType.DATE:
        return isinstance(value, date) and not isinstance(value, datetime) or isinstance(value, str) and _is_iso_date(value)
    if primitive is PrimitiveType.DATETIME:
        return isinstance(value, datetime) or isinstance(value, str) and _is_iso_datetime(value)
    return False


def _family(value: Any, primitive: PrimitiveType) -> str:
    if not isinstance(value, str):
        return f"{primitive.value}_PHYSICAL"
    if primitive is PrimitiveType.BOOLEAN:
        if value == value.lower():
            return "BOOLEAN_LOWER"
        if value == value.upper():
            return "BOOLEAN_UPPER"
        if value == value.title():
            return "BOOLEAN_TITLE"
        return "BOOLEAN_OTHER"
    if primitive is PrimitiveType.INTEGER:
        return "INTEGER_PLUS" if value.startswith("+") else "INTEGER_MINUS" if value.startswith("-") else "INTEGER_UNSIGNED"
    if primitive is PrimitiveType.FLOAT:
        return "FLOAT_PLUS" if value.startswith("+") else "FLOAT_MINUS" if value.startswith("-") else "FLOAT_UNSIGNED"
    if primitive is PrimitiveType.DATE:
        return "DATE_ISO"
    return "DATETIME_Z" if value.endswith("Z") else "DATETIME_OFFSET" if len(value) >= 6 and value[-6] in {"+", "-"} else "DATETIME_NO_TIMEZONE"


def _has_recognized_family(tokens: list[Any]) -> bool:
    return any(any(_is_valid(token, primitive) for primitive in _TYPED) for token in tokens)
