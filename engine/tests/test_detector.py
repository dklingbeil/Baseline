from baseline.detector import ChangeDetector
from baseline.encoders import encode
from baseline.explain import LLMExplainer, TemplateExplainer
from baseline.fusion import fuse
from baseline.synthetic import generate


def history(**kwargs):
    return [
        fuse(parts[0].day, [encode(p) for p in parts]) for parts in generate(**kwargs)
    ]


def test_no_detection_while_building_baseline():
    assert ChangeDetector().detect(history(days=20, shift_at=10)) is None


def test_stable_history_is_not_flagged():
    for seed in range(20):
        assert ChangeDetector().detect(history(shift_at=None, seed=seed)) is None


def test_sustained_shift_is_detected_with_directions():
    days = history(days=42, shift_at=34)
    deviation = ChangeDetector().detect(days)
    assert deviation is not None
    assert deviation.domains["sleep"] == "down"
    assert deviation.domains["energy"] == "down"
    assert deviation.domains["workload"] == "up"
    assert deviation.domains["activity"] == "steady"
    assert abs((deviation.onset - days[34].day).days) <= 2


def test_score_series_is_empty_until_baseline_exists():
    series = ChangeDetector().score_series(history())
    assert all(d.score is None for d in series[:14])
    assert all(d.score is not None for d in series[14:])


def test_explainers():
    deviation = ChangeDetector().detect(history())
    text = TemplateExplainer().explain(deviation)
    assert "Sleep is lower than usual" in text
    assert "Baseline hat" in TemplateExplainer().explain(deviation, "de")

    prompts = []
    llm = LLMExplainer(complete=lambda p: prompts.append(p) or " ok ")
    assert llm.explain(deviation) == "ok"
    assert "- sleep: down" in prompts[0]
