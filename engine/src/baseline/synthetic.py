"""Synthetic histories for tests and the local demo. Not a research dataset."""

from datetime import date, timedelta

import numpy as np

from .schemas import CalendarDaily, CheckIn, HealthDaily


def _scale(x: float) -> int:
    return int(np.clip(round(x), 1, 5))


def generate(
    days: int = 42,
    shift_at: int | None = 34,
    end: date | None = None,
    seed: int = 0,
) -> list[tuple[CheckIn, HealthDaily, CalendarDaily]]:
    """A stable person; from `shift_at` on: less sleep, less energy, more work."""
    rng = np.random.default_rng(seed)
    start = (end or date.today()) - timedelta(days=days - 1)
    out = []
    for i in range(days):
        shifted = shift_at is not None and i >= shift_at
        day = start + timedelta(days=i)
        out.append(
            (
                CheckIn(
                    day=day,
                    mood=_scale(rng.normal(3.6, 0.6)),
                    energy=_scale(rng.normal(1.6 if shifted else 3.6, 0.6)),
                    stress=_scale(rng.normal(2.5, 0.6)),
                    sleep_quality=_scale(rng.normal(2.2 if shifted else 3.7, 0.6)),
                ),
                HealthDaily(
                    day=day,
                    sleep_hours=float(rng.normal(5.6 if shifted else 7.4, 0.5)),
                    steps=int(max(0, rng.normal(8000, 1500))),
                    active_minutes=float(max(0, rng.normal(40, 10))),
                    resting_hr=float(rng.normal(58, 2)),
                    hrv_ms=float(rng.normal(62, 6)),
                ),
                CalendarDaily(
                    day=day,
                    scheduled_hours=float(np.clip(rng.normal(8.5 if shifted else 5.0, 1.0), 0, 24)),
                    events=int(max(0, rng.normal(5, 1.5))),
                    social_events=int(max(0, rng.normal(1, 0.8))),
                ),
            )
        )
    return out
