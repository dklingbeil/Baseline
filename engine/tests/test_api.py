from fastapi.testclient import TestClient

from baseline.api.main import DEMO_SUBJECT, create_app

CHECKIN = {"day": "2026-10-01", "mood": 3, "energy": 3, "stress": 2, "sleep_quality": 4}


def client(**kwargs):
    return TestClient(create_app(**kwargs))


def test_ingestion_requires_consent_per_source():
    c, h = client(), {"X-Subject-Id": "s1"}
    assert c.post("/v1/checkins", json=CHECKIN, headers=h).status_code == 403
    c.put("/v1/consent", json={"sources": ["checkin"]}, headers=h)
    assert c.post("/v1/checkins", json=CHECKIN, headers=h).status_code == 204
    assert c.post("/v1/entries", json={"day": "2026-10-01", "text": "hi"}, headers=h).status_code == 403


def test_new_subject_is_building():
    body = client().get("/v1/baseline", headers={"X-Subject-Id": "s1"}).json()
    assert body["building"] is True
    assert body["deviation"] is None


def test_demo_baseline_feedback_export_delete():
    c, h = client(seed_demo=True), {"X-Subject-Id": DEMO_SUBJECT}
    body = c.get("/v1/baseline", headers=h).json()
    assert body["building"] is False
    assert body["deviation"]["domains"]["sleep"] == "down"
    assert body["explanation"]
    assert body["ai_generated"] is False

    url = f"/v1/deviations/{body['deviation']['id']}/feedback"
    assert c.post(url, json={"accurate": True}, headers=h).status_code == 204

    export = c.get("/v1/me/export", headers=h).json()
    assert len(export["days"]) == 42
    assert export["feedback"][0]["accurate"] is True

    assert c.delete("/v1/me", headers=h).status_code == 204
    assert c.get("/v1/me/export", headers=h).json()["days"] == {}


def test_withdrawing_consent_deletes_that_source():
    c, h = client(seed_demo=True), {"X-Subject-Id": DEMO_SUBJECT}
    c.put("/v1/consent", json={"sources": ["checkin"]}, headers=h)
    days = c.get("/v1/me/export", headers=h).json()["days"]
    assert all(list(sources) == ["checkin"] for sources in days.values())
