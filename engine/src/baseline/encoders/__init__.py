"""Modality-specific encoders: raw source payload -> named features."""

from ..schemas import CalendarDaily, CheckIn, HealthDaily, TextEntry
from .physiology import encode_health
from .routine import encode_calendar
from .self_report import encode_checkin
from .text import encode_text

__all__ = ["encode", "encode_calendar", "encode_checkin", "encode_health", "encode_text"]


def encode(payload: CheckIn | HealthDaily | TextEntry | CalendarDaily) -> dict[str, float]:
    match payload:
        case CheckIn():
            return encode_checkin(payload)
        case HealthDaily():
            return encode_health(payload)
        case TextEntry():
            return encode_text(payload)
        case CalendarDaily():
            return encode_calendar(payload)
    raise TypeError(f"no encoder for {type(payload).__name__}")
