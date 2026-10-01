"""The daily state vector z(t) and the feature registry."""

from dataclasses import dataclass, field
from datetime import date

# Canonical feature order. Encoders may only emit these names.
FEATURES: tuple[str, ...] = (
    # self-report
    "mood",
    "energy",
    "stress",
    "sleep_quality",
    # physiology
    "sleep_hours",
    "steps",
    "active_minutes",
    "resting_hr",
    "hrv_ms",
    # language
    "text_words",
    # routine
    "workload_hours",
    "events",
    "social_events",
)

# User-facing grouping, used by the explainer and the home screen.
DOMAINS: dict[str, tuple[str, ...]] = {
    "mood": ("mood",),
    "energy": ("energy",),
    "stress": ("stress",),
    "sleep": ("sleep_hours", "sleep_quality"),
    "activity": ("steps", "active_minutes"),
    "physiology": ("resting_hr", "hrv_ms"),
    "language": ("text_words",),
    "workload": ("workload_hours", "events"),
    "social": ("social_events",),
}


@dataclass(frozen=True)
class DailyState:
    """z(t): one day of fused features. Missing features are absent."""

    day: date
    values: dict[str, float] = field(default_factory=dict)
