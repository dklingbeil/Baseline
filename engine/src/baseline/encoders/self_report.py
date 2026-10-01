from ..schemas import CheckIn


def encode_checkin(c: CheckIn) -> dict[str, float]:
    return {
        "mood": float(c.mood),
        "energy": float(c.energy),
        "stress": float(c.stress),
        "sleep_quality": float(c.sleep_quality),
    }
