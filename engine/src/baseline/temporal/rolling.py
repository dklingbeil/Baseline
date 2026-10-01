from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

from ..state import DailyState
from .base import Baseline

# Std of a normal sample winsorised at its 10th/90th percentiles is 0.824 sigma.
WINSOR_TO_SIGMA = 1.214


@dataclass(frozen=True)
class RollingRobustBaseline:
    """Per-feature trimmed mean and robust spread over the trailing `window` days."""

    window: int = 28
    trim: float = 0.2
    min_observations: int = 7
    min_scale: float = 1e-3

    def fit(self, history: Sequence[DailyState]) -> Baseline:
        recent = history[-self.window :]
        center: dict[str, float] = {}
        scale: dict[str, float] = {}
        names = {name for state in recent for name in state.values}
        for name in names:
            x = np.array([s.values[name] for s in recent if name in s.values])
            if len(x) < self.min_observations:
                continue
            x.sort()
            k = int(self.trim * len(x))
            center[name] = float(np.mean(x[k : len(x) - k]))
            # Winsorised std: robust to outlier days, and unlike MAD it
            # stays meaningful on coarse scales (1-5 check-ins).
            lo, hi = np.percentile(x, [10, 90])
            spread = float(np.std(np.clip(x, lo, hi))) * WINSOR_TO_SIGMA
            scale[name] = max(spread, self.min_scale)
        return Baseline(center, scale, n_days=len(recent))
