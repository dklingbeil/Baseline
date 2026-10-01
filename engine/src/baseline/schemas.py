"""Raw inputs, one model per data source. These are the API payloads."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field


class Source(StrEnum):
    CHECKIN = "checkin"
    HEALTH = "health"
    TEXT = "text"
    CALENDAR = "calendar"


Scale = Field(ge=1, le=5)


class CheckIn(BaseModel):
    """The 30-second daily self-report."""

    day: date
    mood: int = Scale
    energy: int = Scale
    stress: int = Scale
    sleep_quality: int = Scale


class HealthDaily(BaseModel):
    """Daily summary computed on-device by the iOS app. No raw samples."""

    day: date
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    steps: int | None = Field(default=None, ge=0)
    active_minutes: float | None = Field(default=None, ge=0)
    resting_hr: float | None = Field(default=None, gt=0)
    hrv_ms: float | None = Field(default=None, gt=0)


class TextEntry(BaseModel):
    """Journal or conversation text for one day."""

    day: date
    text: str = Field(min_length=1, max_length=20_000)


class CalendarDaily(BaseModel):
    """Calendar metadata only: no titles, attendees or locations."""

    day: date
    scheduled_hours: float = Field(ge=0, le=24)
    events: int = Field(ge=0)
    social_events: int = Field(default=0, ge=0)


class Consent(BaseModel):
    """Explicit opt-in, per data source."""

    sources: set[Source]


class FeedbackIn(BaseModel):
    accurate: bool
    note: str | None = Field(default=None, max_length=2_000)
