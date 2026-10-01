from ..schemas import CalendarDaily


def encode_calendar(c: CalendarDaily) -> dict[str, float]:
    return {
        "workload_hours": c.scheduled_hours,
        "events": float(c.events),
        "social_events": float(c.social_events),
    }
