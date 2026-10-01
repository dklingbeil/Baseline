from collections.abc import Callable
from dataclasses import dataclass

from ..detector import Deviation

PROMPT = """\
You are the explanation layer of Baseline, a personal wellbeing baseline app.
A statistical model has already decided that this person's recent pattern
differs from their own history. Describe that change in 2-3 plain sentences.

Rules:
- Only describe the changes listed below. Do not add or infer others.
- Do not diagnose, label, or speculate about mental health conditions.
- Do not give medical advice. Phrase it as an observation the person can confirm or reject.
- Write in this language: {locale}.

Change began: {onset}
Detected: {detected}
Domains (relative to this person's own normal):
{domains}
"""


@dataclass(frozen=True)
class LLMExplainer:
    """Provider-agnostic: `complete` is any prompt -> text function.

    The prompt carries only the detector's structured output, never raw
    journal text or sensor data.
    """

    complete: Callable[[str], str]
    ai_generated: bool = True

    def explain(self, deviation: Deviation, locale: str = "en") -> str:
        domains = "\n".join(f"- {d}: {direction}" for d, direction in deviation.domains.items())
        prompt = PROMPT.format(
            locale=locale,
            onset=deviation.onset.isoformat(),
            detected=deviation.detected.isoformat(),
            domains=domains,
        )
        return self.complete(prompt).strip()
