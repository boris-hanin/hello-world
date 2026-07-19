export const meta = {
  name: 'presentify',
  description: 'Turn a daily brief into a narrated interactive slide deck, with an explicit visual-usefulness critique and render-based review',
  whenToUse: 'Runs automatically at the end of daily-briefing; can run standalone on any existing pdb/briefings/<date>/. args: {date: "YYYY-MM-DD"}',
  phases: [
    { title: 'Critique', detail: 'grade every existing chart against the usefulness rubric; prescribe deck visuals' },
    { title: 'Narrate', detail: 'write the spoken script, anchor-style' },
    { title: 'Build', detail: 'build present.html deck; repair brief.html charts per critique' },
    { title: 'Review', detail: 'screenshot rendered slides, critique from pixels, fix' },
  ],
}

const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
if (!ARGS.date) throw new Error('args.date (YYYY-MM-DD) is required')
const DATE = ARGS.date
const DIR = `pdb/briefings/${DATE}`

const RUBRIC = `THE VISUAL USEFULNESS RUBRIC (apply ruthlessly):
1. Five-second test: a chart must answer a stated question at a glance. Its title states
   the TAKEAWAY ("Brent round-tripped the June ceasefire in three weeks"), never just the
   series name ("Brent crude, daily").
2. Data sufficiency and provenance: a line chart needs roughly 8+ points of consistent
   provenance (one source, one price type). Never mix intraday quotes and settlements in
   one line. If the honest data is 3-5 numbers, use a big-number comparison or labeled
   bars, not a fake trend line.
3. Right form for the message: level vs change, comparison, share, timeline-of-events —
   each has a right chart form; not everything is a line. Two series with different units
   never share one axis.
4. Annotate the story ON the chart: mark the event (ceasefire date, record high),
   draw reference lines (target band, five-year norm), label the endpoint. A reader
   should get the point without the caption.
5. Honesty: no truncated-axis drama without a visible axis break, units labeled,
   as-of date and source visible.
6. The deletion test: if removing the chart loses no information, remove it. A weak
   chart costs more credibility than no chart.`

// ---- Critique and Narrate are independent — run concurrently
phase('Critique')
const [critique, narration] = await parallel([
  () => agent(`You are the visual critic for an intelligence briefing product. The operator has
complained the current charts are poor. Work in the repo at the current directory.
${RUBRIC}
Read ${DIR}/signals.json and ${DIR}/brief.html (the chart figures and their data tables).
For EVERY chart in brief.html: grade it against the rubric and return a verdict —
"keep" (rare; it passes all six), "redesign" (salvageable data, wrong form/title/
annotation; give a precise redesign_spec: form, title-as-takeaway, annotations,
which points to drop for provenance consistency), or "drop" (fails the deletion or
sufficiency test; say why). Then, for the slide deck about to be built, prescribe
slide_visuals: for each briefing item, the ONE visual that would teach the most in five
seconds (may be a redesigned existing chart, a big-number comparison, an annotated
map-free schematic built from the item's data — never invented data), with a full spec.
Also write summary_md: a frank one-page critique of today's visuals overall, for the
record. Return JSON.`,
    { label: 'visual-critic', phase: 'Critique', schema: {
      type: 'object', required: ['charts', 'slide_visuals', 'summary_md'],
      properties: {
        charts: { type: 'array', items: { type: 'object', required: ['chart_title', 'verdict', 'critique'], properties: { chart_title: { type: 'string' }, item: { type: 'string' }, verdict: { enum: ['keep', 'redesign', 'drop'] }, critique: { type: 'string' }, redesign_spec: { type: 'string' } } } },
        slide_visuals: { type: 'array', items: { type: 'object', required: ['item', 'spec'], properties: { item: { type: 'string' }, spec: { type: 'string' } } } },
        summary_md: { type: 'string' },
      },
    } }),
  () => agent(`You are the narration writer for a daily intelligence briefing delivered as a
narrated slide deck — think a top-tier podcast anchor: conversational, direct address,
zero jargon, but information-dense and never breathless. Work in the repo at the current
directory. Read ${DIR}/brief.md.
Write the spoken script as slides:
- Slide 1 "The morning in one minute": the key judgments, spoken plainly.
- One slide per briefing item: what happened, why it matters, the first-principles
  mechanics (use the brief's "The mechanics" passages — they were written for this),
  and the probability-band judgment, all as flowing speech.
- One slide for the cross-cutting trends.
- One slide "What we might be getting wrong": the red team's strongest points, honestly.
- Closing slide: the specific falsifiers/dates to watch next.
Rules: numbers rounded for the ear ("about ninety dollars a barrel" — the visual carries
precision); every acronym spoken in full; NO claims that are not in brief.md; each
slide's narration 30-90 seconds spoken (~75-220 words); total 8-14 minutes. For each
slide also give: title (short, punchy), bullets (2-4 on-screen fragments, max ~8 words
each), and visual_hint (which item/visual belongs on screen). Return JSON.`,
    { label: 'narrator', phase: 'Narrate', schema: {
      type: 'object', required: ['slides'],
      properties: { slides: { type: 'array', items: { type: 'object', required: ['title', 'narration', 'bullets'], properties: { title: { type: 'string' }, narration: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } }, visual_hint: { type: 'string' } } } } },
    } }),
])
if (!critique || !narration) throw new Error('critique or narration failed')
log(`Critique: ${critique.charts.filter(c => c.verdict === 'keep').length} keep / ${critique.charts.filter(c => c.verdict === 'redesign').length} redesign / ${critique.charts.filter(c => c.verdict === 'drop').length} drop across ${critique.charts.length} charts`)

// ---- Build: deck and brief-chart repair are independent
phase('Build')
const [deckResult] = await parallel([
  () => agent(`You are building a polished, self-contained narrated slide deck. Work in the repo
at the current directory. FIRST load the "dataviz" skill via the Skill tool, and follow
it for every chart. Also read pdb/briefings/${DATE}/signals.json for the underlying data.
${RUBRIC}

Write TWO files:
1. ${DIR}/narration.json — the slide script verbatim: ${JSON.stringify(narration.slides)}
2. ${DIR}/present.html — a single self-contained HTML presentation (no external
resources whatsoever; inline everything):

DESIGN: a real presentation, not a scrolling document. One slide fills the viewport;
dark-first cinematic look with a considered light theme (prefers-color-scheme +
data-theme override); large confident typography (bullets are fragments, never
paragraphs); the visual is the hero of each slide. Build each slide's visual from the
visual critic's specs below — inline SVG, takeaway titles, event annotations, reference
lines, endpoint labels. Specs: ${JSON.stringify(critique.slide_visuals)}

NARRATION (the NotebookLM-like part), via the browser's built-in speechSynthesis (works
offline, no network):
- Big play/pause button + Space; when playing, speak the current slide's narration and
  AUTO-ADVANCE to the next slide when the utterance ends.
- Voice picker (prefer natural/en voices, persist choice in localStorage), rate control
  0.8x-1.4x, and a transcript toggle showing the current narration text.
- Arrow keys / click zones / touch swipe for manual navigation; progress dots + "slide
  N of M"; deep-linkable slides via #slide-3 hashes (render correct slide on load).
- Graceful degradation: if no voices are available, show the transcript and a note,
  deck remains fully usable manually. Cancel speech cleanly on manual navigation.
Respect prefers-reduced-motion. Test-read your own HTML for unclosed tags before
finishing. Return JSON: {"files": [paths], "n_slides": N}`,
    { label: 'deck-builder', phase: 'Build', schema: { type: 'object', required: ['files', 'n_slides'], properties: { files: { type: 'array', items: { type: 'string' } }, n_slides: { type: 'integer' } } } }),
  () => agent(`You are repairing the charts in an existing briefing page per the visual critic's
verdicts. Work in the repo at the current directory. FIRST load the "dataviz" skill via
the Skill tool. Edit ${DIR}/brief.html IN PLACE:
${RUBRIC}
Verdicts: ${JSON.stringify(critique.charts)}
- "drop": remove the figure (keep its data table content only if the numbers are not
  already in the item text).
- "redesign": rebuild the figure per its redesign_spec (form, takeaway title,
  annotations, provenance-consistent points). Keep the page self-contained and both
  themes working. Do not touch the prose. Also append the critic's summary_md as an
  HTML comment at the end of the file for the record.
Return JSON: {"kept": N, "redesigned": N, "dropped": N}`,
    { label: 'brief-chart-repair', phase: 'Build', schema: { type: 'object', required: ['kept', 'redesigned', 'dropped'], properties: { kept: { type: 'integer' }, redesigned: { type: 'integer' }, dropped: { type: 'integer' } } } }),
])
if (!deckResult) throw new Error('deck build failed')

// ---- Review from rendered pixels, then fix
phase('Review')
const review = await agent(`You are reviewing a slide deck from its RENDERED output, not its code. Work in the
repo at the current directory.
${RUBRIC}
The deck is ${DIR}/present.html with ${deckResult.n_slides} slides, deep-linkable via
#slide-N. Chromium is preinstalled: find the binary under /opt/pw-browsers (ls it), then
screenshot each slide headlessly, e.g.:
  <chromium-binary> --headless --disable-gpu --no-sandbox --window-size=1440,900 \
    --virtual-time-budget=6000 --screenshot=/tmp/slide-N.png "file://$PWD/${DIR}/present.html#slide-N"
Read each PNG. Judge like a hard-to-please design director AND the visual critic:
overflowing/clipped text, unreadable sizes, charts failing the five-second test, missing
annotations, contrast failures, broken layout, empty slides. Also sanity-check one
screenshot with ?theme=light if the deck supports it, or note if you cannot. Return JSON:
{"passes": bool, "issues": [{"slide": N, "issue": "...", "fix": "..."}]} — empty issues
only if it genuinely ships as-is.`,
  { label: 'render-review', phase: 'Review', schema: {
    type: 'object', required: ['passes', 'issues'],
    properties: { passes: { type: 'boolean' }, issues: { type: 'array', items: { type: 'object', required: ['slide', 'issue', 'fix'], properties: { slide: { type: 'integer' }, issue: { type: 'string' }, fix: { type: 'string' } } } } },
  } })

let fixed = 0
if (review && !review.passes && review.issues.length) {
  log(`Render review found ${review.issues.length} issues — fixing`)
  await agent(`Fix these concrete issues in ${DIR}/present.html (edit in place, keep it
self-contained, keep both themes and the narration player working):
${JSON.stringify(review.issues)}
After fixing, re-screenshot the affected slides with headless Chromium (binary under
/opt/pw-browsers) to confirm each fix rendered, and say what you verified.`,
    { label: 'deck-fixer', phase: 'Review' })
  fixed = review.issues.length
}

// ---- Persist the critique for the record
await agent(`Write ${DIR}/visual-critique.md containing exactly this markdown (plus a
"# Visual critique — ${DATE}" heading and a rendered-review appendix listing these
issues and that they were addressed: ${JSON.stringify(review ? review.issues : [])}):

${critique.summary_md}

Return the single word: done`, { label: 'write-critique', phase: 'Review' })

return {
  date: DATE,
  files: [`${DIR}/present.html`, `${DIR}/narration.json`, `${DIR}/visual-critique.md`],
  n_slides: deckResult.n_slides,
  chart_verdicts: { keep: critique.charts.filter(c => c.verdict === 'keep').length, redesign: critique.charts.filter(c => c.verdict === 'redesign').length, drop: critique.charts.filter(c => c.verdict === 'drop').length },
  render_issues_fixed: fixed,
}
