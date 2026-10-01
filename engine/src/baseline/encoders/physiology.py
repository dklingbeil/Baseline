from ..schemas import HealthDaily


def encode_health(h: HealthDaily) -> dict[str, float]:
    raw = h.model_dump(exclude={"day"}, exclude_none=True)
    return {name: float(value) for name, value in raw.items()}
