"""Feedback -> model.

Confirmed and rejected deviations are the research dataset
(multimodal data -> detected deviation -> user verdict -> later outcome).
"""

from collections.abc import Sequence

from .detector import ChangeDetector
from .storage import FeedbackRecord


def personalise(detector: ChangeDetector, feedback: Sequence[FeedbackRecord]) -> ChangeDetector:
    """Return a detector adapted to this person's verdicts.

    TODO: not implemented. Candidate first step: raise `shift_threshold`
    after repeated rejections, lower it after confirmations, per feature.
    """
    return detector
