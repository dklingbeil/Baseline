"""Fuse per-source features into the daily state vector z(t).

Sources emit disjoint feature names, so fusion is currently a merge in
canonical order. A learned fusion layer would replace `fuse` later.
"""

from collections.abc import Iterable
from datetime import date

from .state import FEATURES, DailyState


def fuse(day: date, per_source: Iterable[dict[str, float]]) -> DailyState:
    merged: dict[str, float] = {}
    for features in per_source:
        merged.update(features)
    unknown = merged.keys() - set(FEATURES)
    if unknown:
        raise ValueError(f"unregistered features: {sorted(unknown)}")
    return DailyState(day, {name: merged[name] for name in FEATURES if name in merged})
