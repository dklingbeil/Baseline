from typing import Protocol

from ..detector import Deviation


class Explainer(Protocol):
    # Shown to the user alongside the text (EU AI Act transparency).
    ai_generated: bool

    def explain(self, deviation: Deviation, locale: str = "en") -> str: ...
