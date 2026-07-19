export const meta = {
  name: 'weekly-investment',
  description: 'Weekly macro forecast + investment memo: resolve past predictions, forecast, refute, map to instruments, append to ledger',
  whenToUse: 'Run at end of week. args: {date: "YYYY-MM-DD" (required, memo date)}',
  phases: [
    { title: 'Resolve', detail: 'score predictions that came due; refresh scorecard' },
    { title: 'Review', detail: 'digest the week of daily briefings' },
    { title: 'Forecast', detail: 'four lens agents produce resolvable predictions' },
    { title: 'Refute', detail: 'three adversarial lenses per prediction' },
    { title: 'Map', detail: 'surviving predictions to instrument theses' },
    { title: 'Compile', detail: 'append ledger, write memo.md and memo.html' },
  ],
}

if (!args || !args.date) throw new Error('args.date (YYYY-MM-DD) is required')
const DATE = args.date
const OUT_DIR = `pdb/weekly/${DATE}`

const METHODOLOGY = `Follow pdb/METHODOLOGY.md (read it first). Ethos: skeptical, pragmatic,
rational. Quantitative and falsifiable or it does not ship. Today's date is ${DATE}.
Use WebSearch/WebFetch (load via ToolSearch if needed) for market data; prefer primary
sources (exchange settlements, FRED, central bank releases).`

const PREDICTION_PROPS = {
  id: { type: 'string' },
  date_made: { type: 'string' },
  lens: { enum: ['rates_fx', 'equities', 'commodities_energy', 'geopolitics'] },
  statement: { type: 'string' },
  metric: { type: 'string' },
  comparator: { enum: ['>', '>=', '<', '<=', 'within_range', 'event_occurs'] },
  threshold: {},
  resolution_date: { type: 'string' },
  resolution_source: { type: 'string' },
  probability: { type: 'number' },
  rationale: { type: 'string' },
  base_rate_note: { type: 'string' },
}
const FORECAST_SCHEMA = {
  type: 'object',
  required: ['predictions'],
  properties: {
    predictions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['lens', 'statement', 'metric', 'comparator', 'threshold', 'resolution_date', 'resolution_source', 'probability', 'rationale', 'base_rate_note'],
        properties: PREDICTION_PROPS,
      },
    },
  },
}
const REFUTE_SCHEMA = {
  type: 'object',
  required: ['refuted', 'argument'],
  properties: { refuted: { type: 'boolean' }, argument: { type: 'string' }, suggested_probability: { type: 'number' } },
}

const LENSES = [
  { key: 'rates_fx', focus: 'sovereign rates, yield curves, central bank paths, and major FX pairs' },
  { key: 'equities', focus: 'equity indices, sector rotation, credit spreads, and volatility' },
  { key: 'commodities_energy', focus: 'oil, gas, metals, agriculture: prices, inventories, flows' },
  { key: 'geopolitics', focus: 'geopolitical events with market transmission: conflict escalation/de-escalation, sanctions, elections, trade actions' },
]

// ---- Phase 1: Resolve — the system grades itself before it may forecast again
phase('Resolve')
const scorecard = await agent(`You are the resolution officer for a forecasting ledger. Work in the repo at the
current directory.
${METHODOLOGY}
1. Run: python3 pdb/tools/backtest.py due --date ${DATE}
2. For each due prediction, research the ACTUAL outcome from its resolution_source
   (or the nearest authoritative public source). Determine outcome true/false; if the
   metric is genuinely unreadable, mark it voided with a note.
3. APPEND one line per resolution to pdb/ledger/resolutions.jsonl in the form
   {"id": ..., "resolved_date": "${DATE}", "observed_value": ..., "outcome": true|false,
    "note": ..., "source_url": ...} (for voided: {"id":..., "resolved_date":..., "voided": true, "note": ...}).
   Append only — never rewrite existing lines.
4. Run: python3 pdb/tools/backtest.py score --json
Return that JSON scorecard (plus {"resolved_now": N} merged in). If nothing was due,
return the scorecard as-is with resolved_now=0.`,
  { label: 'resolve-ledger', phase: 'Resolve' })

// ---- Phase 2: Review the week's briefings
phase('Review')
const weekDigest = await agent(`You are reviewing the past week of daily intelligence briefings. Work in the repo
at the current directory.
${METHODOLOGY}
Read every pdb/briefings/<date>/brief.md with date within 7 days before ${DATE} (list the
directory to find them; read signals.json too if present). Produce a markdown digest of
the week's dominant macro currents: what trended, what reversed, what data surprised,
which red-team warnings look prescient. Include the concrete numbers. If no briefings
exist yet, say so and instead build the digest from a fresh web sweep of the week's
major macro developments.`, { label: 'week-digest', phase: 'Review' })

// ---- Phase 3: Forecast (needs digest + scorecard; lenses run in parallel)
phase('Forecast')
const forecasts = await parallel(LENSES.map(l => () =>
  agent(`You are a short-term macro forecaster on the "${l.key}" lens: ${l.focus}.
${METHODOLOGY}
This week's digest:
${weekDigest}

Current calibration scorecard (your own track record — correct for past miscalibration):
${typeof scorecard === 'string' ? scorecard : JSON.stringify(scorecard)}

Produce 3-5 predictions for the next 5-30 days, each conforming to
pdb/schemas/prediction.schema.json (read it): named public metric, comparator,
numeric threshold, resolution_date within 30 days of ${DATE}, named resolution_source,
probability in [0.05, 0.95], rationale tied to this week's evidence, and a
base_rate_note stating the unconditional frequency of the predicted move. Look up
CURRENT market levels before setting thresholds — a threshold set from a stale level
is an automatic refutation. Set lens="${l.key}". Prefer fewer, sharper predictions.`,
    { label: `forecast:${l.key}`, phase: 'Forecast', schema: FORECAST_SCHEMA })
))

const candidates = forecasts.filter(Boolean).flatMap(f => f.predictions || [])
log(`${candidates.length} candidate predictions`)
if (!candidates.length) throw new Error('No predictions produced')

// ---- Phase 4: Refute — three adversarial lenses per prediction; >=2 refutations kill
const REFUTER_ANGLES = [
  { key: 'base-rate', prompt: 'Attack via base-rate neglect: how often does a move of this size in this horizon actually happen? Is the stated probability just narrative enthusiasm on top of a rare event?' },
  { key: 'priced-in', prompt: 'Attack via already-priced-in: check current market pricing (futures, implied probabilities, consensus forecasts). If the market already prices this, the prediction has no edge and its probability should match market-implied, not exceed it.' },
  { key: 'data-quality', prompt: 'Attack via data quality and resolvability: is the metric precisely readable from the named resolution_source on the resolution date? Is the threshold well-defined (settlement vs intraday, which contract, which fixing)? Ambiguity = refuted.' },
]
const judged = await pipeline(
  candidates,
  (pred, _orig, i) =>
    parallel(REFUTER_ANGLES.map(a => () =>
      agent(`You are an adversarial refuter (${a.key}) reviewing a macro prediction. You are
rewarded for correctly killing bad predictions, not for agreeableness.
${METHODOLOGY}
Prediction: ${JSON.stringify(pred)}
${a.prompt}
Verify current levels with a web search. Set refuted=true unless the prediction clearly
survives your attack; optionally give suggested_probability if it survives but is
miscalibrated.`, { label: `refute:${a.key}:${i}`, phase: 'Refute', schema: REFUTE_SCHEMA })
    )).then(votes => {
      const v = votes.filter(Boolean)
      const refutations = v.filter(x => x.refuted).length
      const suggestions = v.map(x => x.suggested_probability).filter(x => typeof x === 'number')
      return { pred, votes: v, refutations, survives: refutations <= 1, suggestions }
    })
)

const survivors = judged.filter(Boolean).filter(j => j.survives).map(j => {
  const p = { ...j.pred, refutations_survived: 3 - j.refutations, status: 'open', date_made: DATE }
  if (j.suggestions.length) {
    const adj = j.suggestions.reduce((a, b) => a + b, 0) / j.suggestions.length
    p.probability = Math.round(((p.probability + adj) / 2) * 100) / 100
  }
  return { survivor: p, refuter_notes: j.votes.map(v => v.argument) }
})
const killedPreds = judged.filter(Boolean).filter(j => !j.survives)
  .map(j => ({ statement: j.pred.statement, arguments: j.votes.filter(v => v.refuted).map(v => v.argument) }))
log(`${survivors.length} predictions survive refutation, ${killedPreds.length} killed`)
if (!survivors.length) throw new Error('All predictions refuted — no memo to write (this can be legitimate; inspect refuter arguments in the journal)')

// ---- Phase 5: Map to instruments
phase('Map')
const mapped = await agent(`You are mapping surviving macro predictions to investment theses.
${METHODOLOGY} Also read pdb/METHODOLOGY.md section 9 and follow it exactly.
Surviving predictions (with refuter notes): ${JSON.stringify(survivors)}
For each prediction, add an instrument_map: a LIQUID instrument (major ETF, futures
contract, or FX pair), direction, and an explicit invalidation condition (a price or
data level that proves the thesis wrong). Where two predictions conflict, say so and
resolve or drop one. Return JSON: {"theses": [{...prediction with instrument_map...}],
"portfolio_notes": "cross-thesis correlations, aggregate risk concentrations"}`,
  { label: 'map-instruments', phase: 'Map', schema: {
    type: 'object', required: ['theses'],
    properties: {
      theses: { type: 'array', items: { type: 'object', required: ['statement', 'metric', 'probability', 'instrument_map'], properties: { ...PREDICTION_PROPS, refutations_survived: { type: 'integer' }, status: { type: 'string' }, instrument_map: { type: 'object', required: ['instrument', 'direction', 'invalidation'], properties: { instrument: { type: 'string' }, direction: { enum: ['long', 'short', 'neutral'] }, invalidation: { type: 'string' } } } } } },
      portfolio_notes: { type: 'string' },
    },
  } })

// ---- Phase 6: Compile — single agent does the serial ledger append + memo
phase('Compile')
const compileResult = await agent(`You are the editor producing this week's investment memo. Work in the repo at the
current directory.
${METHODOLOGY}
Inputs:
- Scorecard: ${typeof scorecard === 'string' ? scorecard : JSON.stringify(scorecard)}
- Week digest (markdown): included below
- Final theses: ${JSON.stringify(mapped)}
- Predictions killed in refutation: ${JSON.stringify(killedPreds)}

Steps:
1. Assign each thesis an id "${DATE}-<lens-abbrev>-<nn>" and APPEND each one as a single
   JSON line to pdb/ledger/predictions.jsonl (validate mentally against
   pdb/schemas/prediction.schema.json; never rewrite existing lines).
2. Read pdb/templates/weekly-memo.md and write ${OUT_DIR}/memo.md per that layout:
   scorecard first, then the week in review, then one section per thesis (statement,
   probability, base rate, instrument, direction, invalidation, ledger id), then the
   killed-predictions section with the refuters' arguments, then the standing disclaimer.
3. Write ${OUT_DIR}/scorecard.json with the scorecard JSON.
4. Write ${OUT_DIR}/memo.html — self-contained HTML version (load the "dataviz" skill
   BEFORE writing chart code; chart the calibration table and, if past resolutions
   exist, the Brier trend; inline SVG only, no external resources, light+dark schemes).

Week digest:
${weekDigest}

Return JSON: {"files": [paths], "n_theses": N, "ledger_ids": [...]}`,
  { label: 'compile-memo', phase: 'Compile', schema: { type: 'object', required: ['files', 'n_theses'], properties: { files: { type: 'array', items: { type: 'string' } }, n_theses: { type: 'integer' }, ledger_ids: { type: 'array', items: { type: 'string' } } } } })

log(`Memo compiled: ${(compileResult.files || []).join(', ')}`)
return {
  date: DATE,
  out_dir: OUT_DIR,
  files: compileResult.files,
  candidates: candidates.length,
  survivors: compileResult.n_theses,
  ledger_ids: compileResult.ledger_ids,
  killed_in_refutation: killedPreds.map(k => k.statement),
}
