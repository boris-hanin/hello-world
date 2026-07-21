# Visual critique — 2026-07-20

# Visual critique — Daily Brief, 2026-07-20

**Bottom line: the data layer is excellent and the storytelling layer is uniformly broken.** Seven charts; zero drops, zero clean keeps, seven redesigns — and nearly all of the redesign cost is titles, reference lines, and moving disclosures from captions onto the charts. Nothing here needs new data.

## What the pipeline gets right (keep doing this)
- **Provenance discipline is genuinely good.** The Brent chart refuses to splice intraday futures onto EIA spot; the Hormuz single observation is rendered as two bars, not a fake trend; magnet-export months with no reported figure are left as honest gaps and disclosed; every figure carries source and as-of date; every chart ships a data table. This is rubric rules 2 and 5 handled better than most professional publications.
- **Right forms throughout.** Lines for dense single-source series, bars for counts and levels-with-zero, labeled bars for the no-time-dimension rate comparison. No dual-axis crimes, no unit mixing on a shared axis.

## The systemic failure: every title is a series name
All seven titles are of the form "Brent crude daily spot price, April 1 – July 13" — i.e., the axis label promoted to a headline. The actual takeaways ("the rout was mostly pre-K3," "Beijing already rehearsed the cutoff," "~$23B/month expires Friday") exist, verbatim and well-written, in the small grey `.chart-msg` text that a five-second reader never touches. The single highest-leverage fix in the whole product is a house rule: **the `message` field in signals.json becomes the chart title; the series name moves to the caption.** The data structure already contains the right sentence in every case — the renderer is just putting it in the wrong slot.

## Second-order problems
1. **Claims asserted but not drawn.** "Past the bear-market line" with no −20% reference line; "fully retraced" with no pre-shock reference level; "quadrupled" with no pre-2025 baseline rule. Reference lines are cheap and every one of these is missing.
2. **Disclosures hiding in captions.** The Brent chart ends Jul 13 while the headline says $90 on Jul 20; the Hormuz count is eight days stale; June's NET customs receipts were negative; the 2.2% MFN bar is an average among statutory rates. All disclosed — all in caption-only positions where they read as fine print rather than as part of the chart's honesty.
3. **The dissent section knows things the charts don't say.** The red team's two best points — the Hormuz number's staleness and the pre-K3 attribution problem — are both *provable from the charts' own data* but neither chart is framed to prove them. When your adversarial reviewer's argument can be settled by your own figure, the figure should be titled to settle it.
4. **One curated endpoint.** The DeepSeek precedent window ends on exactly the recovery day. The caption honestly notes the subsequent tariff-driven slide, but ending a "full recovery" chart on the recovery close is the kind of framing choice that should be flagged on-chart, especially for an n=1 base rate.

## Deletion-test results
No chart fails outright. The weakest is the six-bar "Tariff rates in play" (its numbers all appear in prose), but it survives because the *spread* — 2.2% fallback vs 10–25% on either side — genuinely reads faster visually; it needs regrouping by causal role (expiring / gap / incoming), not deletion. The best chart analytically is the magnet-export series: it is the item's base-rate argument made visible, and with a takeaway title it would be a model chart.

## For the deck
Four items, four visuals, specced separately: the Brent round-trip arc with a 10/88 Hormuz stat inset; a rebased two-panel SOX small multiple (2026 rout vs 2025 DeepSeek template, shock-day aligned); a timeline-plus-rate-ladder schematic for the tariff cliff (the story is a calendar, not a time series); and the magnet-export dial chart with the $6.5T and Nov 10 stakes as sidebar tiles. No invented data required for any of them.

## Appendix: rendered-review issues

The rendered deck was reviewed and passed, with the three advisory issues below. No fixes were applied during the review run itself; the fixes were applied and screenshot-verified in a follow-up pass (headless-Chromium renders of slides 1 and 2, including the no-TTS degrade path).

1. **Slide 2 — headline/plot contradiction on Brent level.** Five-second tension: the slide title says "Oil at Ninety" and a kicker chip says "Brent near $90, highest since June", but the plotted line ends at $81.62 (Jul 13). The evidence for "ninety" exists only in a small gray side note ("Jul 14-20 futures ~$88-90 - a different price type, not plotted"), so a glance-reader sees a falling line to $82 under a $90 headline. The honest refusal to splice price types is correct, but the visual and the title momentarily contradict each other.
   *Recommended fix (applied and verified in the follow-up pass):* Add a clearly differentiated marker for the recent level — e.g. a hollow/dashed point or short tick at ~$88-90 labeled "Jul 20 futures (different source, not spliced)" in a distinct style — or retitle the takeaway to lead with the plotted fact ("back to $82 and climbing") and let the $90 futures note carry the update.

2. **Slide 1 — transcript panel auto-opens and obscures slides when TTS is unavailable.** In browsers with no speech-synthesis voices, the transcript panel auto-opens on load and covers roughly the middle half of every slide (verified in headless render), so the first impression of each slide is a wall of narration text obscuring the visualization until the user finds the Transcript toggle or T key.
   *Recommended fix (applied and verified in the follow-up pass):* When falling back for missing TTS, show only the small corner note and leave the transcript collapsed by default, or dock the transcript below the slide content instead of overlaying it.

3. **Slide 2 — provenance date inconsistent with deck date.** The source line reads "US EIA daily Europe Brent spot (retrieved Jul 21, 2026)" (same on slide 3's SOX source) while the deck masthead says Monday, July 20, 2026 — a reader checking honesty rules will notice data "retrieved" the day after the brief's date.
   *Recommended fix (applied and verified in the follow-up pass):* Align the retrieved/as-of date with the brief date (or state "retrieved early Jul 21 UTC" deliberately) so the as-of stamp and masthead agree.
