"""Change detection: recent z(t) against the historical baseline B(t).

The detector, not the LLM, decides whether something changed.
"""

import math
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date
from statistics import fmean
from typing import Literal

from .state import DOMAINS, DailyState
from .temporal import Baseline, BaselineModel, RollingRobustBaseline

Direction = Literal["up", "down", "steady"]


@dataclass(frozen=True)
class Deviation:
    """A sustained departure from the person's own baseline."""

    onset: date
    detected: date
    score: float
    # Sustained per-feature shift over the recent window, in baseline sigmas.
    shifts: dict[str, float]
    domains: dict[str, Direction]

    @property
    def id(self) -> str:
        return self.onset.isoformat()


@dataclass(frozen=True)
class ScoredDay:
    day: date
    # None while the baseline is still being built.
    score: float | None


def distance(z: dict[str, float]) -> float:
    """How unusual a day is: RMS of its per-feature z-scores."""
    if not z:
        return 0.0
    return math.sqrt(sum(v * v for v in z.values()) / len(z))


@dataclass(frozen=True)
class ChangeDetector:
    model: BaselineModel = field(default_factory=RollingRobustBaseline)
    # "Building your Baseline": no detection before this much history.
    min_baseline_days: int = 14
    recent_days: int = 7
    # A feature has changed if its recent mean is this many sigmas off.
    shift_threshold: float = 2.0
    # Daily distance above which a day counts as outside the normal range.
    normal_range: float = 1.5

    def split(self, history: Sequence[DailyState]) -> tuple[Baseline, Sequence[DailyState]] | None:
        """Baseline from everything before the recent window, plus that window."""
        if len(history) < self.min_baseline_days + self.recent_days:
            return None
        return self.model.fit(history[: -self.recent_days]), history[-self.recent_days :]

    def detect(self, history: Sequence[DailyState]) -> Deviation | None:
        parts = self.split(history)
        if parts is None:
            return None
        baseline, recent = parts

        daily_z = [baseline.zscores(s.values) for s in recent]
        shifts = {}
        for name in baseline.center:
            observed = [z[name] for z in daily_z if name in z]
            if len(observed) > len(recent) // 2:
                shifts[name] = fmean(observed)

        changed = {n: z for n, z in shifts.items() if abs(z) >= self.shift_threshold}
        if not changed:
            return None

        outside = [s.day for s, z in zip(recent, daily_z) if distance(z) >= self.normal_range]
        return Deviation(
            onset=outside[0] if outside else recent[0].day,
            detected=recent[-1].day,
            score=max(abs(z) for z in changed.values()),
            shifts=shifts,
            domains=self._domains(shifts),
        )

    def score_series(self, history: Sequence[DailyState]) -> list[ScoredDay]:
        """Each day's distance from the baseline fitted on the days before it."""
        series = []
        for i, state in enumerate(history):
            if i < self.min_baseline_days:
                series.append(ScoredDay(state.day, None))
                continue
            baseline = self.model.fit(history[:i])
            series.append(ScoredDay(state.day, distance(baseline.zscores(state.values))))
        return series

    def _domains(self, shifts: dict[str, float]) -> dict[str, Direction]:
        out: dict[str, Direction] = {}
        for domain, names in DOMAINS.items():
            present = [shifts[n] for n in names if n in shifts]
            if not present:
                continue
            strongest = max(present, key=abs)
            if abs(strongest) < self.shift_threshold:
                out[domain] = "steady"
            else:
                out[domain] = "up" if strongest > 0 else "down"
        return out
