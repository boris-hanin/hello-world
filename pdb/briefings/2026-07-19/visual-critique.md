# Visual critique — 2026-07-19

# Visual critique — 2026-07-19 briefing

**Verdicts: 0 keep, 8 redesign, 4 drop (of 12).** The operator's complaint is justified. The charts read as mechanically generated: every item gets exactly two figures regardless of merit, every figure is a line chart, and every title is a series label ("Brent monthly average spot, 2026 conflict path") rather than a takeaway. Not one chart in the brief passes the five-second test.

**What's systematically broken**

1. **Zero event annotation in an events product.** This is an intelligence briefing about a war, a ceasefire collapse, an FOMC, and a GDP miss — and no chart marks a single event, reference line, or target. The storage chart's own *title* cites the 67.5% norm and 80% target and then draws neither. The China GDP chart omits the 4.5-5.0% band that makes 4.3% news. The core-PCE chart has no 2% target line. The pipeline clearly has an endpoint-label and max-label habit (good instinct) and stopped there.

2. **Sparse mixed-provenance points drawn as trend lines.** Three charts (Brent dated prints; Brent "key settlements" compiled partly from Wikipedia; TTF "documented prints, not continuous") join 5-9 heterogeneous numbers — intraday quotes, futures quotes, settles, a value back-derived from a percent change, and one "settled >60" plotted as exactly 60.00 — into confident continuous lines. One caption literally discloses "mixed intraday quotes and settles." These are the rubric's textbook fake trends; the honest forms are labeled bars, dot timelines, or big-number pairs.

3. **Redundancy that fails the deletion test.** Three Brent charts in one brief; two SOX charts in one item; a China LPR chart whose series has been flat for 14 months (its entire content is one sentence). Worse, the SOX weekly chart *contradicts its own title*: Friday sampling misses the Monday June 22 record, so the plotted run-up is +79% not the claimed +96% and the plotted drawdown is -12.7% not -20.2%.

4. **Charts lag the verification pass.** The verifier corrected the misdated Micron/AMD moves, the 75%-vs-67.5% storage norm, and the stale injection-rate figure — the item headlines absorbed the corrections but the figure choices didn't (the 3,786 GWh/day number keyed to the dead 90% target survives in a caption; nothing visualizes the corrected 16pp gap).

**What's genuinely good and should be kept as house style:** sourced captions with units and as-of dates on every figure, accompanying data tables, true-time x-axis spacing, and disciplined endpoint labeling. Rubric #5 is the one rule this pipeline mostly obeys. The underlying data work (FRED, NBS, AGSI+, Nasdaq daily closes) is strong — the failures are in form, titling, and annotation, not collection.

**The fix, in priority order:** (1) titles become takeaways, everywhere; (2) draw the reference lines and event flags the text already contains; (3) route any series under ~8 consistent points to bars, dot timelines, or big numbers; (4) one strong visual per item beats two weak ones — the two-charts-per-item quota should die; (5) make the chart generator consume the verifier's corrections, not just the signal.

## Appendix: rendered-review findings (addressed)

The deck was reviewed as rendered at 1440x900. The following issues were found and have been addressed:

1. **Slide 4 — footer clipped by overflow (addressed).** Slide content overflowed the slide viewport by ~49px (scrollHeight 889 vs clientHeight 840 at 1440x900), so the Sources footer — which carries the as-of date, provenance (OPEC secondary sources via YCharts/TradingEconomics/CEIC, Kuwait MoD/KPC) and the stated judgment probabilities — was clipped behind the bottom control bar and unreadable. This was the only slide failing the honesty rubric's "source and as-of date visible" requirement, purely due to layout. *Fix applied:* reclaimed ~50px of vertical space on slide 4 — reduced the Kuwait chart height (it had generous headroom above the 2,660 pre-war line), tightened the .facts card padding, and shortened the Falsifier ribbon to one line — so the footer.src now sits fully above the control bar. Re-verified with slide.scrollHeight <= slide.clientHeight.

2. **Slide 8 — causal-diagram edge labels illegible (addressed).** The gray edge labels on the causal diagram ("inflation impulse", "rates diverge", "oil-import cost", "power prices → HICP") were small and low-contrast against the dark background, and "power prices → HICP" crowded the left edge of the China node where two arrows converge — the causal mechanics are the point of this slide but the labels were the hardest thing on it to read. *Fix applied:* bumped edge-label size ~1-2px and lightened them to the same muted-foreground token used for axis labels (not the dimmer gray), and nudged "power prices → HICP" left/up so it clears the China node border.

3. **Slide 1 — transcript panel obscures deck when speech is unavailable (addressed).** When speech synthesis was unavailable (any headless or voice-less browser), the transcript panel auto-opened and permanently covered the bottom ~45% of every slide — on slide 1 it hid four of the six probability bars, the correlation warning, and the legend until the viewer discovered the Transcript toggle. First impression was a half-obscured deck. *Fix applied:* in degrade(), replaced the full transcript auto-open with a one-line dismissible banner ("No speech voices — press T for transcript"), keeping the slide's own content legible.
