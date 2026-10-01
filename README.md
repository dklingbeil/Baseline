# Baseline

A multimodal personal baseline engine. Baseline learns what is normal for one person across sleep, activity, physiology, self-report, language and routine, and tells them when their own pattern meaningfully changes.

The question is never "does this look like depression?". It is "how unusual is this person's recent state relative to their own history?"

**The ML baseline model is the product.** The LLM is one interface: it explains a change the model has already detected. It does not decide whether anything changed.

## How it works

```text
 Text / journal   Apple Health   Daily check-in   Calendar metadata
       └───────────────┴───────────────┴───────────────┘
                               ↓
                  Modality-specific encoders
                               ↓
                    Daily state vector z(t)
                               ↓
              Temporal baseline model  →  B(t)
                               ↓
          Change detector: recent z(t) vs historical B
                               ↓
                 Explainer (template or LLM)
                               ↓
               ✓ Accurate / ✕ Incorrect  →  feedback
```

| Stage | Now (MVP skeleton) | Later |
|---|---|---|
| Encoders | Check-in, health and calendar pass through as named features; text is a word-count placeholder | Pretrained EN/DE text encoder |
| Fusion | Merge of disjoint per-source features | Learned fusion |
| Temporal model | Rolling 28-day trimmed mean and winsorised spread, per feature | State-space model or transformer trained across users |
| Detector | Sustained 7-day shift of 2+ sigma in any feature, after 14 days of baseline | Calibrated per person from feedback |
| Explainer | Deterministic EN/DE template; LLM explainer behind a provider-agnostic `complete(prompt) -> str` | Provider chosen with EU hosting in mind |
| Feedback | Recorded and exported; `personalise()` is a stub | Feeds thresholds and the research dataset |

## Repository layout

```
engine/                     Python package `baseline` + FastAPI service
  src/baseline/
    schemas.py              raw inputs per data source (API payloads)
    state.py                feature registry and DailyState, z(t)
    encoders/               self_report, physiology, text, routine
    fusion.py               per-source features -> z(t)
    temporal/               BaselineModel protocol, RollingRobustBaseline
    detector.py             ChangeDetector, Deviation, daily score series
    explain/                Explainer protocol, template and LLM explainers
    feedback.py             feedback -> model (stub)
    pipeline.py             history -> Snapshot for the home screen
    storage/                identity store and wellbeing store, kept apart
    synthetic.py            synthetic histories for tests and the demo
    api/main.py             HTTP API
  tests/
apps/web/                   Next.js prototype: baseline home screen, daily check-in
apps/ios/                   SwiftUI companion: HealthKit consent and daily sync
docs/                       research protocol, privacy design
site/                       marketing site (static, deployed by Netlify)
```

## Run it

Engine and API, seeded with a synthetic 42-day history for the subject `demo`:

```bash
cd engine && uv run pytest
```

```bash
cd engine && BASELINE_SEED_DEMO=1 uv run uvicorn baseline.api.main:app --reload
```

Web prototype at http://localhost:3000 (expects the API on port 8000):

```bash
cd apps/web && cp .env.example .env.local && npm install && npm run dev
```

iOS companion (requires [XcodeGen](https://github.com/yonaskolb/XcodeGen); the `.xcodeproj` is generated, not committed):

```bash
cd apps/ios && xcodegen generate && open Baseline.xcodeproj
```

Marketing site:

```bash
npx serve site
```

## API

All routes take an `X-Subject-Id` header. This is a placeholder for real auth.

| Route | Purpose |
|---|---|
| `GET/PUT /v1/consent` | Per-source opt-in. Withdrawing a source deletes its data. |
| `POST /v1/checkins` | Daily check-in: mood, energy, stress, sleep quality (1 to 5) |
| `POST /v1/health/daily` | Daily health summaries from the iOS app |
| `POST /v1/entries` | Journal or conversation text |
| `POST /v1/calendar/daily` | Calendar metadata: scheduled hours, event counts |
| `GET /v1/baseline` | Home screen snapshot: score series, normal range, deviation, explanation |
| `POST /v1/deviations/{id}/feedback` | Accurate / incorrect |
| `GET /v1/me/export`, `DELETE /v1/me` | Export or delete everything |

Ingestion returns 403 for a source the subject has not consented to.

## Research MVP

- 6 to 8 weeks per participant: about 2 weeks building the baseline, then testing whether meaningful deviations can be detected.
- First cohort 20 to 50, next 100 to 300. B2C, ages 18 to 30, Austria and Germany first, English and German.
- The dataset that matters: multimodal data → detected deviation → user confirms or rejects → later outcome.

See [docs/research-protocol.md](docs/research-protocol.md).

## Privacy

Inferred wellbeing information is treated as special-category data under GDPR. Design commitments, and where the skeleton stands on each, are in [docs/privacy.md](docs/privacy.md). In short: EU hosting, separate identity and wellbeing stores, explicit opt-in per source, export and delete, minimised raw data, AI-generated text labelled as such, no advertising or data sale, no employer access.

Baseline is not a medical device and does not diagnose.

## Not built yet

Auth, persistent storage, encryption, the real text encoder, a concrete LLM provider, feedback-driven personalisation, calendar ingestion on the client, German UI strings in the web app, and deployment of the engine.
