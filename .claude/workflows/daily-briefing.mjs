export const meta = {
  name: 'daily-briefing',
  description: 'OSINT presidential-style daily brief: collect -> triage -> verify -> context -> synthesize -> compile',
  whenToUse: 'Produce the daily macro intelligence briefing. args: {date: "YYYY-MM-DD" (required), scale: "pilot"|"full" (default full)}',
  phases: [
    { title: 'Collect', detail: 'parallel beat collectors sweep primary open sources' },
    { title: 'Triage', detail: 'dedupe and rank all signals by materiality' },
    { title: 'Verify', detail: 'adversarial verification per signal' },
    { title: 'Context', detail: 'history, technicals, and chartable series per signal' },
    { title: 'Synthesize', detail: 'cross-cutting trends plus red-team dissent' },
    { title: 'Compile', detail: 'write brief.md and self-contained brief.html' },
  ],
}

const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
if (!ARGS.date) throw new Error('args.date (YYYY-MM-DD) is required — scripts cannot read the clock')
const DATE = ARGS.date
const SCALE = ARGS.scale === 'pilot' ? 'pilot' : 'full'
const OUT_DIR = `pdb/briefings/${DATE}`
const TOP_N = SCALE === 'pilot' ? 6 : 10
const PER_BEAT = SCALE === 'pilot' ? 4 : 6

const METHODOLOGY = `Follow the analytic standards in pdb/METHODOLOGY.md (read it first):
ICD-203 probability bands, NATO source grades (A-F reliability x 1-6 credibility),
confirmed-vs-claimed discipline, base rates before significance judgments,
numbers over adjectives, falsifiability. Ethos: skeptical, pragmatic, rational.
Use WebSearch and WebFetch (load via ToolSearch if needed) and prefer PRIMARY
sources: central bank releases, official statistics, exchange data, court
filings, wire services. Today's date is ${DATE}.`

const ALL_BEATS = [
  { key: 'geo-europe-russia', pilot: true, focus: 'Europe and Russia/Ukraine: war developments, EU policy, NATO, European politics and energy security' },
  { key: 'geo-mena', pilot: true, focus: 'Middle East and North Africa: conflicts, Gulf states, Iran, Israel, oil politics, shipping chokepoints' },
  { key: 'geo-indopacific', pilot: true, focus: 'Indo-Pacific: China (economy, politics, military), Taiwan, Koreas, Japan, ASEAN, US-China relations' },
  { key: 'geo-southasia', pilot: false, focus: 'South and Central Asia: India, Pakistan, Afghanistan, Central Asian states' },
  { key: 'geo-americas', pilot: false, focus: 'The Americas: US domestic policy with macro impact, Latin American politics and economies' },
  { key: 'geo-africa', pilot: false, focus: 'Sub-Saharan Africa: conflicts, coups, elections, debt distress, critical minerals' },
  { key: 'macro-central-banks', pilot: true, focus: 'Central banks and macro data: Fed/ECB/BoJ/PBoC decisions and speeches, inflation prints, employment, PMIs, GDP releases from the last 48h' },
  { key: 'markets', pilot: true, focus: 'Global markets: notable moves in equities, rates, credit spreads, FX, and volatility, with the actual numbers and what drove them' },
  { key: 'energy-commodities', pilot: true, focus: 'Energy and commodities: oil/gas prices and flows, OPEC+, metals, agriculture, inventories' },
  { key: 'tech-ai', pilot: true, focus: 'Technology and AI: frontier model/compute developments, semiconductor supply chain, major regulatory moves, with macro relevance' },
  { key: 'supply-trade', pilot: false, focus: 'Supply chains and trade: tariffs, sanctions, export controls, shipping rates, port and logistics disruptions' },
  { key: 'health-climate', pilot: false, focus: 'Health, climate, disasters: outbreaks, extreme weather with economic impact, agricultural stress, insurance losses' },
]
const BEATS = SCALE === 'pilot' ? ALL_BEATS.filter(b => b.pilot) : ALL_BEATS

const SIGNALS_SCHEMA = {
  type: 'object',
  required: ['signals'],
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['headline', 'summary', 'why_it_matters', 'beat', 'region', 'sector', 'sources', 'status', 'confidence', 'materiality'],
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
          why_it_matters: { type: 'string' },
          beat: { type: 'string' },
          region: { type: 'string' },
          sector: { type: 'string' },
          status: { enum: ['confirmed', 'reported', 'disputed'] },
          confidence: { type: 'number' },
          materiality: { type: 'integer' },
          novelty: { type: 'string' },
          sources: { type: 'array', items: { type: 'object', required: ['url', 'publisher', 'grade'], properties: { url: { type: 'string' }, publisher: { type: 'string' }, grade: { type: 'string' }, published_at: { type: 'string' } } } },
          data_points: { type: 'array', items: { type: 'object', properties: { metric: { type: 'string' }, value: {}, unit: { type: 'string' }, as_of: { type: 'string' }, source_url: { type: 'string' } } } },
        },
      },
    },
  },
}

const TRIAGE_SCHEMA = {
  type: 'object',
  required: ['selected'],
  properties: {
    selected: { type: 'array', items: { type: 'object', required: ['index', 'rank_rationale'], properties: { index: { type: 'integer' }, rank_rationale: { type: 'string' }, merged_with: { type: 'array', items: { type: 'integer' } } } } },
    dropped_note: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['stands', 'revised_status', 'revised_confidence', 'notes'],
  properties: {
    stands: { type: 'boolean' },
    revised_status: { enum: ['confirmed', 'reported', 'disputed'] },
    revised_confidence: { type: 'number' },
    notes: { type: 'string' },
    corrections: { type: 'string' },
    best_source_grade: { type: 'string' },
  },
}

const CONTEXT_SCHEMA = {
  type: 'object',
  required: ['context_md'],
  properties: {
    context_md: { type: 'string' },
    base_rate: { type: 'string' },
    series: { type: 'array', items: { type: 'object', required: ['label', 'points'], properties: { label: { type: 'string' }, unit: { type: 'string' }, source: { type: 'string' }, points: { type: 'array', items: { type: 'object', required: ['x', 'y'], properties: { x: { type: 'string' }, y: { type: 'number' } } } } } } },
  },
}

// ---- Phase 1: Collect (barrier is required because triage ranks the whole field)
phase('Collect')
log(`Sweeping ${BEATS.length} beats at ${SCALE} scale for ${DATE}`)
const collected = await parallel(BEATS.map(b => () =>
  agent(`You are an intelligence collector on the "${b.key}" beat: ${b.focus}.
${METHODOLOGY}
Sweep developments from the last 24-48 hours. Return your ${PER_BEAT} most material
signals as structured data. Set beat="${b.key}". Grade every source. Include concrete
data_points (numbers with as_of dates and source URLs) wherever they exist. Do not
pad: fewer, well-sourced signals beat many thin ones. Skip anything that is pure
commentary with no new fact.`, { label: `collect:${b.key}`, phase: 'Collect', schema: SIGNALS_SCHEMA })
))

const allSignals = collected.filter(Boolean).flatMap(r => r.signals || [])
if (!allSignals.length) throw new Error('No signals collected — check network/search access')
log(`${allSignals.length} raw signals collected`)

// ---- Phase 2: Triage (single agent sees the whole field)
phase('Triage')
const numbered = allSignals.map((s, i) => `[${i}] (${s.beat}, materiality=${s.materiality}, ${s.status}) ${s.headline} — ${s.summary}`).join('\n')
const triage = await agent(`You are the triage editor of a presidential-style daily brief.
${METHODOLOGY}
Below are today's raw signals. Deduplicate semantically (same underlying event reported
by two beats = one signal; record duplicates in merged_with). Then select the TOP ${TOP_N}
by materiality to global macro trends — prefer items that change a trend line over items
that merely continue one, and penalize single-source unconfirmed reports. Return the
selected indices ranked most material first.

${numbered}`, { label: 'triage', phase: 'Triage', schema: TRIAGE_SCHEMA })

const picked = triage.selected.slice(0, TOP_N).map(sel => ({
  signal: allSignals[sel.index],
  merged: (sel.merged_with || []).map(i => allSignals[i]).filter(Boolean),
  rank_rationale: sel.rank_rationale,
})).filter(p => p.signal)
log(`${picked.length} signals survive triage`)

// ---- Phases 3+4: Verify then Context, pipelined per signal (no barrier between them)
const enriched = await pipeline(
  picked,
  (item, _orig, i) =>
    agent(`You are an adversarial verifier. Your job is to REFUTE this signal, not confirm it.
${METHODOLOGY}
Signal: ${JSON.stringify(item.signal)}
Independently re-search it. Check: does independent confirmation exist beyond the cited
sources? Is anything stated as fact that is actually a claim by an interested party? Is
the base rate for this class of event being ignored? Are the numbers right? If it fails,
set stands=false. If it stands but weaker than claimed, downgrade revised_status /
revised_confidence and note corrections.`,
      { label: `verify:${i}:${item.signal.beat}`, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(verdict => ({ ...item, verdict })),
  (item, _orig, i) => {
    if (!item.verdict || !item.verdict.stands) return { ...item, context: null }
    return agent(`You are a context analyst for a daily intelligence brief.
${METHODOLOGY}
Signal (verified): ${JSON.stringify(item.signal)}
Verifier notes: ${JSON.stringify(item.verdict)}
Produce: (1) context_md — the historical precedent and technical background a smart
generalist needs to actually understand this item (comparable past episodes with dates
and outcomes, how the relevant mechanism works), 5-10 tight sentences; (2) base_rate —
the unconditional frequency of this class of event/move; (3) series — one or two numeric
time series (5-30 points each) that would make a genuinely informative chart for this
item, from real data you can find (prices, rates, counts), each point {x: date, y: number},
with unit and source. Omit series if no honest numeric series exists — never invent data.`,
      { label: `context:${i}:${item.signal.beat}`, phase: 'Context', schema: CONTEXT_SCHEMA })
      .then(context => ({ ...item, context }))
  }
)

const surviving = enriched.filter(Boolean).filter(e => e.verdict && e.verdict.stands)
const killed = enriched.filter(Boolean).filter(e => e.verdict && !e.verdict.stands)
log(`${surviving.length} signals verified, ${killed.length} killed by verification`)
if (!surviving.length) throw new Error('All signals killed in verification — inspect verifier output')

// ---- Phase 5: Synthesize (barrier: trends need the full verified set) — synthesis + red team run concurrently
phase('Synthesize')
const briefingInput = JSON.stringify(surviving.map(e => ({
  signal: e.signal, verdict: e.verdict, context: e.context, rank_rationale: e.rank_rationale,
})))
const [synthesis, redTeam] = await parallel([
  () => agent(`You are the senior analyst synthesizing today's verified signals into macro trends.
${METHODOLOGY}
Verified signals with context: ${briefingInput}
Identify 2-4 cross-cutting macro trends that connect multiple signals (e.g. several
signals jointly implying a tightening/loosening, escalation/de-escalation, supply
tightening). For each trend: name it, list which signals support it, state a key
judgment with an explicit ICD-203 probability band, and name what evidence would
falsify it. Return markdown.`, { label: 'synthesis', phase: 'Synthesize' }),
  () => agent(`You are the red team on a daily intelligence brief. You did not write it and you
are rewarded for finding what is wrong with it.
${METHODOLOGY}
Verified signals with context: ${briefingInput}
Write a "What we might be getting wrong" section, markdown, 4-8 bullets: which items are
likely overhyped relative to base rates, where the sourcing is weakest, what plausible
alternative interpretation is being ignored, and what the consensus narrative would miss.
Be specific — name the signals you are attacking.`, { label: 'red-team', phase: 'Synthesize' }),
])

// ---- Phase 6: Compile
phase('Compile')
const compileResult = await agent(`You are the writer/editor producing today's briefing files. Work in the repo at the
current directory.
${METHODOLOGY}
Read pdb/templates/daily-brief.md for the layout. Then write THREE files:

1. ${OUT_DIR}/signals.json — the raw structured record. Verified items:
${briefingInput}
Plus a "killed" array for signals rejected in verification: ${JSON.stringify(killed.map(k => ({ headline: k.signal.headline, reason: k.verdict && k.verdict.notes })))}

2. ${OUT_DIR}/brief.md — the daily brief for ${DATE} per the template: BLUF key judgments
   first (with probability bands), then one section per item (headline, what happened,
   why it matters, context, sources with grades), then the macro trends synthesis below,
   then the red-team dissent VERBATIM, then a one-line note of items killed in
   verification and why.

   Macro trends synthesis:
   --------------------
   ${synthesis || '(synthesis unavailable)'}
   --------------------

   Red-team dissent (include verbatim):
   --------------------
   ${redTeam || '(red team unavailable)'}
   --------------------

3. ${OUT_DIR}/brief.html — a single self-contained HTML page of the same content,
   designed for reading: load the "dataviz" skill via the Skill tool BEFORE writing any
   chart code, then render each item's numeric series (in signals.json "context.series")
   as inline SVG charts with axis labels, units, and source captions. No external
   resources of any kind (no CDN, no remote fonts/images) — everything inline. Support
   light and dark color schemes. Do NOT fabricate data: chart only the series provided;
   if an item has no series, no chart.

Return exactly this JSON in your final message: {"files": [paths written], "n_items": N, "titles": [item headlines]}`,
  { label: 'compile', phase: 'Compile', schema: { type: 'object', required: ['files', 'n_items'], properties: { files: { type: 'array', items: { type: 'string' } }, n_items: { type: 'integer' }, titles: { type: 'array', items: { type: 'string' } } } } })

log(`Brief compiled: ${(compileResult.files || []).join(', ')}`)
return {
  date: DATE,
  scale: SCALE,
  out_dir: OUT_DIR,
  files: compileResult.files,
  raw_signals: allSignals.length,
  published_items: surviving.length,
  killed_in_verification: killed.map(k => k.signal.headline),
  titles: compileResult.titles,
}
