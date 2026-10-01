from dataclasses import dataclass

from ..detector import Deviation

_TEXT = {
    "en": {
        "lead": "Baseline noticed a change in your normal pattern {days} days ago.",
        "up": "higher than usual",
        "down": "lower than usual",
        "join": "{domain} is {direction}",
    },
    "de": {
        "lead": "Baseline hat vor {days} Tagen eine Veränderung in deinem gewohnten Muster bemerkt.",
        "up": "höher als üblich",
        "down": "niedriger als üblich",
        "join": "{domain}: {direction}",
    },
}


@dataclass(frozen=True)
class TemplateExplainer:
    """Deterministic fallback. No model, no data leaves the process."""

    ai_generated: bool = False

    def explain(self, deviation: Deviation, locale: str = "en") -> str:
        t = _TEXT.get(locale, _TEXT["en"])
        days = (deviation.detected - deviation.onset).days + 1
        parts = [
            t["join"].format(domain=domain.capitalize(), direction=t[direction])
            for domain, direction in deviation.domains.items()
            if direction != "steady"
        ]
        return " ".join([t["lead"].format(days=days), "; ".join(parts) + "."])
