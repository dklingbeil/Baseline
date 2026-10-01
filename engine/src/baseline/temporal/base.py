from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from ..state import DailyState

Z_CLIP = 6.0


@dataclass(frozen=True)
class Baseline:
    """B(t): the person's normal level and spread, per feature."""

    center: dict[str, float]
    scale: dict[str, float]
    n_days: int

    def zscores(self, values: dict[str, float]) -> dict[str, float]:
        """Deviation of `values` from the baseline, in units of normal spread."""
        z = {}
        for name, value in values.items():
            if name in self.center:
                raw = (value - self.center[name]) / self.scale[name]
                z[name] = max(-Z_CLIP, min(Z_CLIP, raw))
        return z


class BaselineModel(Protocol):
    """Anything that turns a person's history into a baseline.

    The rolling model is the MVP. A state-space model or a transformer
    pretrained across users would implement the same interface.
    """

    def fit(self, history: Sequence[DailyState]) -> Baseline: ...
