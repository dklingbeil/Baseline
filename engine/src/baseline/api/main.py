"""HTTP API for the web prototype and the iOS companion app."""

import os
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..detector import ChangeDetector
from ..encoders import encode
from ..explain import Explainer, TemplateExplainer
from ..feedback import personalise
from ..pipeline import snapshot
from ..schemas import CalendarDaily, CheckIn, Consent, FeedbackIn, HealthDaily, Source, TextEntry
from ..storage import FeedbackRecord, IdentityStore, WellbeingStore
from ..synthetic import generate

DEMO_SUBJECT = "demo"


def subject(x_subject_id: Annotated[str, Header()]) -> str:
    # TODO: replace with real auth. The session resolves to a subject id via
    # the identity store; the client never chooses its own.
    return x_subject_id


Subject = Annotated[str, Depends(subject)]


def create_app(explainer: Explainer | None = None, seed_demo: bool | None = None) -> FastAPI:
    app = FastAPI(title="Baseline", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get("BASELINE_CORS_ORIGINS", "http://localhost:3000").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    identity = IdentityStore()
    store = WellbeingStore()
    detector = ChangeDetector()
    explainer = explainer or TemplateExplainer()

    def ingest(subject_id: str, source: Source, payload) -> None:
        if source not in store.consent(subject_id):
            raise HTTPException(403, f"no consent for source '{source}'")
        store.put(subject_id, payload.day, source, encode(payload))

    if seed_demo if seed_demo is not None else os.environ.get("BASELINE_SEED_DEMO") == "1":
        store.set_consent(DEMO_SUBJECT, set(Source))
        for checkin, health, calendar in generate():
            ingest(DEMO_SUBJECT, Source.CHECKIN, checkin)
            ingest(DEMO_SUBJECT, Source.HEALTH, health)
            ingest(DEMO_SUBJECT, Source.CALENDAR, calendar)

    @app.get("/v1/consent")
    def get_consent(subject_id: Subject) -> Consent:
        return Consent(sources=store.consent(subject_id))

    @app.put("/v1/consent")
    def put_consent(consent: Consent, subject_id: Subject) -> Consent:
        store.set_consent(subject_id, consent.sources)
        return consent

    @app.post("/v1/checkins", status_code=204)
    def post_checkin(payload: CheckIn, subject_id: Subject) -> None:
        ingest(subject_id, Source.CHECKIN, payload)

    @app.post("/v1/health/daily", status_code=204)
    def post_health(payload: list[HealthDaily], subject_id: Subject) -> None:
        for day in payload:
            ingest(subject_id, Source.HEALTH, day)

    @app.post("/v1/entries", status_code=204)
    def post_entry(payload: TextEntry, subject_id: Subject) -> None:
        ingest(subject_id, Source.TEXT, payload)

    @app.post("/v1/calendar/daily", status_code=204)
    def post_calendar(payload: list[CalendarDaily], subject_id: Subject) -> None:
        for day in payload:
            ingest(subject_id, Source.CALENDAR, day)

    @app.get("/v1/baseline")
    def get_baseline(subject_id: Subject, locale: str = "en") -> dict:
        personal = personalise(detector, store.feedback(subject_id))
        snap = snapshot(store.history(subject_id), personal, explainer, locale)
        body = asdict(snap)
        body["building"] = snap.building
        if snap.deviation:
            body["deviation"]["id"] = snap.deviation.id
        return body

    @app.post("/v1/deviations/{deviation_id}/feedback", status_code=204)
    def post_feedback(deviation_id: str, payload: FeedbackIn, subject_id: Subject) -> None:
        store.add_feedback(
            subject_id,
            FeedbackRecord(deviation_id, payload.accurate, payload.note, datetime.now(UTC)),
        )

    @app.get("/v1/me/export")
    def export(subject_id: Subject) -> dict:
        return store.export(subject_id)

    @app.delete("/v1/me", status_code=204)
    def delete(subject_id: Subject) -> None:
        store.delete(subject_id)
        identity.delete(subject_id)

    return app


app = create_app()
