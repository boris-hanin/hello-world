# PDB — Open-Source Intelligence Daily Briefing System

An agentic pipeline that turns raw open-source information into a
presidential-style daily briefing, plus a weekly quantitative
macro-forecast and investment memo. Everything is data-driven,
source-graded, adversarially verified, and backtestable.

## Components

```
pdb/
├── ARCHITECTURE.md          this file
├── METHODOLOGY.md           analytic standards (probability bands, source grades, red-teaming)
├── OPERATIONS.md            how to run, schedule, and tune the workflows
├── schemas/
│   ├── signal.schema.json       structured unit of intelligence
│   └── prediction.schema.json   structured, resolvable forecast
├── templates/
│   ├── daily-brief.md           layout of the daily briefing
│   └── weekly-memo.md           layout of the weekly investment memo
├── tools/
│   └── backtest.py              scores the prediction ledger (Brier, calibration, hit rates)
├── ledger/
│   ├── predictions.jsonl        append-only forecast ledger
│   └── resolutions.jsonl        append-only outcomes
├── briefings/<YYYY-MM-DD>/      daily outputs (brief.md, brief.html, signals.json)
└── weekly/<YYYY-MM-DD>/         weekly outputs (memo.md, memo.html, scorecard.json)

.claude/workflows/
├── daily-briefing.mjs       the daily multi-agent pipeline
└── weekly-investment.mjs    the weekly forecast + investment pipeline
```

## Daily pipeline (`daily-briefing.mjs`)

Six phases; agent counts shown for full scale (pilot scale in parentheses):

1. **Collect** — 12 (7) beat collectors run in parallel, one per
   geography/sector beat (Europe–Russia, MENA, Indo-Pacific, South/Central
   Asia, Americas, Africa, central banks & macro data, markets,
   energy & commodities, tech & AI, supply chains & trade,
   health/climate/disasters). Each sweeps primary sources from the last
   24–48h via web search and returns structured **signals**
   (see `schemas/signal.schema.json`) with data points and graded sources.
2. **Triage** — a barrier: all signals are merged, semantically deduped,
   and ranked by materiality. Top 10 (6) survive. The barrier is
   deliberate — ranking requires seeing the whole field.
3. **Verify** — each surviving signal gets an adversarial verifier whose
   job is to *refute* it: independent sourcing, confirmed vs. claimed,
   base rates, motivated-source checks. Signals can be downgraded or
   killed here. Runs as a pipeline (no barrier) so verification starts
   the moment triage emits.
4. **Context** — each verified signal gets an enricher that adds
   historical precedent, technical background, and a numeric time series
   suitable for charting.
5. **Synthesize** — a barrier: a synthesis agent connects signals into
   cross-cutting macro trends while a red-team agent independently argues
   what is overhyped, what the consensus is missing, and what would
   falsify each judgment. Both outputs feed the writer.
6. **Compile** — a writer produces `brief.md` and a self-contained
   `brief.html` with inline-SVG data visualizations, BLUF-style key
   judgments with explicit probability language, and the red-team's
   dissent preserved in a "What we might be getting wrong" section.

## Weekly pipeline (`weekly-investment.mjs`)

1. **Resolve** — score every open prediction whose resolution date has
   passed: research actual outcomes, append to `resolutions.jsonl`, run
   `tools/backtest.py` to refresh the scorecard. The system grades itself
   before it is allowed to forecast again.
2. **Review** — digest the week's daily briefings into the dominant macro
   currents.
3. **Forecast** — four lens agents (rates & FX, equities & sectors,
   commodities & energy, geopolitical risk transmission) each produce
   3–5 predictions conforming to `schemas/prediction.schema.json`:
   explicit metric, threshold, horizon, probability, and resolution
   source. No vibes — if it can't be resolved by a named data source on a
   named date, it doesn't enter the ledger.
4. **Refute** — every prediction faces three adversarial lenses
   (base-rate neglect, already-priced-in, data-quality). Two or more
   refutations kill it.
5. **Map** — surviving predictions are mapped to instrument-level theses
   (liquid ETFs/futures/FX) with sizing logic, an explicit invalidation
   condition, and the standing disclaimer.
6. **Compile** — append survivors to the ledger, write `memo.md` /
   `memo.html` including the current calibration scorecard, so every memo
   opens with how well (or badly) the system has actually predicted.

## Design principles

- **Structured over prose at every internal boundary.** Agents exchange
  JSON validated against schemas; prose only appears in the final
  deliverables.
- **Verification is adversarial, not confirmatory.** Verifiers and
  refuters are prompted to kill findings, and survival requires majority.
- **Every forecast is a liability until resolved.** The append-only
  ledger plus `backtest.py` make the system's track record a first-class,
  unfalsifiable-by-editing artifact.
- **Pipelines by default, barriers only where ranking/dedup genuinely
  needs the whole set.** Keeps wall-clock near the slowest chain, not the
  sum of stages.
