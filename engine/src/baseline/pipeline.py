"""End-to-end: history -> baseline -> deviation -> explanation."""

from collections.abc import Sequence
from dataclasses import dataclass

from .detector import ChangeDetector, Deviation, ScoredDay
from .explain import Explainer
from .state import DailyState


@dataclass(frozen=True)
class Snapshot:
    """What the home screen shows."""

    days_collected: int
    days_needed: int
    normal_range: float
    series: list[ScoredDay]
    deviation: Deviation | None
    explanation: str | None
    ai_generated: bool

    @property
    def building(self) -> bool:
        return self.days_collected < self.days_needed


def snapshot(
    history: Sequence[DailyState],
    detector: ChangeDetector,
    explainer: Explainer,
    locale: str = "en",
) -> Snapshot:
    deviation = detector.detect(history)
    return Snapshot(
        days_collected=len(history),
        days_needed=detector.min_baseline_days + detector.recent_days,
        normal_range=detector.normal_range,
        series=detector.score_series(history),
        deviation=deviation,
        explanation=explainer.explain(deviation, locale) if deviation else None,
        ai_generated=explainer.ai_generated and deviation is not None,
    )
