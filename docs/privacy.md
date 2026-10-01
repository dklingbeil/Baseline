# Privacy design

Inferred mental and wellbeing information can fall under GDPR special-category (health) data, so the design assumes it does. This is an engineering summary, not legal advice; the consent flow and DPIA need review before the first cohort.

| Commitment | Status in the skeleton |
|---|---|
| EU-hosted infrastructure | Not deployed yet. Constrains the choice of host and LLM provider. |
| Encryption at rest and in transit | Not built. Stores are in-memory. |
| Separate identity and wellbeing stores | `storage/identity.py` and `storage/wellbeing.py` share only a pseudonymous subject id. |
| Explicit opt-in per data source | `PUT /v1/consent`; ingestion without consent returns 403; withdrawal deletes that source. |
| Delete and export everything | `DELETE /v1/me`, `GET /v1/me/export`. |
| Raw data minimised | iOS sends daily totals, never HealthKit samples. Journal text is encoded on ingestion and not stored. Calendar is counts and hours only. |
| User can see and correct what Baseline believes | Accurate / incorrect on each deviation. Per-feature correction is not built. |
| AI transparency | `Explainer.ai_generated` drives a visible label in the UI. |
| The LLM sees as little as possible | The LLM prompt contains only the detector's structured output, not text or sensor data. |
| No advertising, no data sale, no employer access | Policy. Emotion-recognition restrictions in workplaces and education under the EU AI Act are a reason to keep it that way. |

Out of scope for the MVP: GPS, message content, microphone or any passive audio.

## Open questions

- Journal text is currently discarded after encoding. The research dataset may want it kept, under separate consent.
- Lawful basis and consent wording for research use versus product use.
- Whether any on-device inference is needed to make the minimisation claim stronger.
