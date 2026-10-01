# Research protocol (draft)

## Question

Can a within-person baseline model detect changes that the person themselves confirms as meaningful?

## Participants

- Cohort 1: 20 to 50. Cohort 2: 100 to 300.
- Ages 18 to 30: students, young professionals, knowledge workers.
- Austria and Germany; English and German.

## Timeline per participant (6 to 8 weeks)

| Weeks | Phase | What the participant sees |
|---|---|---|
| 1 to 2 | Building the baseline | "Building your Baseline", progress only |
| 3 to 8 | Detection | Baseline chart, detected changes, explanation, accurate / incorrect |

The engine enforces the first phase: no detection before 14 baseline days plus a 7-day recent window (`ChangeDetector.min_baseline_days`, `recent_days`).

## Data sources

1. Daily check-in (about 30 seconds): mood, energy, stress, sleep perception.
2. Apple Health: sleep duration, steps, exercise minutes, resting HR, HRV where available.
3. Journal or conversation text.
4. Optional calendar metadata: workload density, schedule changes.

## Dataset

```text
multimodal data → model detects deviation → user confirms / rejects → later outcome
```

## Measures to define before cohort 1

- Precision: share of detected deviations marked accurate.
- Missed changes: a way for participants to report a change Baseline did not flag.
- Later outcome: what is collected, and when.
- Retention and check-in adherence.
- Android participants: no health source yet.
