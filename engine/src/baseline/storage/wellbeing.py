from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime

from ..fusion import fuse
from ..schemas import Source
from ..state import DailyState


@dataclass(frozen=True)
class FeedbackRecord:
    deviation_id: str
    accurate: bool
    note: str | None
    at: datetime


class WellbeingStore:
    """Encoded features, consent and feedback, keyed by subject id only."""

    def __init__(self) -> None:
        self._consent: dict[str, set[Source]] = defaultdict(set)
        self._features: dict[str, dict[date, dict[Source, dict[str, float]]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        self._feedback: dict[str, list[FeedbackRecord]] = defaultdict(list)

    def consent(self, subject_id: str) -> set[Source]:
        return set(self._consent[subject_id])

    def set_consent(self, subject_id: str, sources: set[Source]) -> None:
        """Withdrawing consent for a source also deletes its data."""
        for withdrawn in self._consent[subject_id] - sources:
            for per_source in self._features[subject_id].values():
                per_source.pop(withdrawn, None)
        self._consent[subject_id] = set(sources)

    def put(self, subject_id: str, day: date, source: Source, features: dict[str, float]) -> None:
        self._features[subject_id][day][source] = features

    def history(self, subject_id: str) -> list[DailyState]:
        days = self._features[subject_id]
        return [fuse(day, days[day].values()) for day in sorted(days) if days[day]]

    def add_feedback(self, subject_id: str, record: FeedbackRecord) -> None:
        self._feedback[subject_id].append(record)

    def feedback(self, subject_id: str) -> list[FeedbackRecord]:
        return list(self._feedback[subject_id])

    def export(self, subject_id: str) -> dict:
        """Everything Baseline holds about this subject."""
        return {
            "consent": sorted(self._consent[subject_id]),
            "days": {
                day.isoformat(): {str(source): f for source, f in per_source.items()}
                for day, per_source in sorted(self._features[subject_id].items())
            },
            "feedback": [
                {**asdict(r), "at": r.at.isoformat()} for r in self._feedback[subject_id]
            ],
        }

    def delete(self, subject_id: str) -> None:
        self._consent.pop(subject_id, None)
        self._features.pop(subject_id, None)
        self._feedback.pop(subject_id, None)
