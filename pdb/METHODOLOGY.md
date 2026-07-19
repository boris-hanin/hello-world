# Analytic Methodology

The ethos: skeptical, pragmatic, deeply rational. These standards are
injected into agent prompts by the workflows and govern every deliverable.

## 1. Probability language (ICD 203-derived)

Every judgment carries an explicit probability band. Words map to numbers;
no unquantified hedging ("could", "might", "possibly" alone are banned in
key judgments).

| Term                        | Probability |
|-----------------------------|-------------|
| almost no chance            | 1–5%        |
| very unlikely               | 5–20%       |
| unlikely                    | 20–45%      |
| roughly even chance         | 45–55%      |
| likely                      | 55–80%      |
| very likely                 | 80–95%      |
| almost certain              | 95–99%      |

## 2. Source grading (NATO-style, two-axis)

Every source cited in a signal gets a grade `reliability/credibility`:

- **Reliability (A–F):** A = official primary data (central bank release,
  filed court document, exchange data); B = wire service or outlet with a
  strong correction record; C = single-outlet reporting, credible; D =
  partisan/state-aligned media; E = unverified social media; F = cannot
  judge.
- **Credibility (1–6):** 1 = confirmed by independent sources; 2 =
  probably true; 3 = possibly true; 4 = doubtful; 5 = improbable; 6 =
  cannot judge.

A signal whose best source is worse than C3 cannot appear in the brief as
fact — only, if material enough, flagged as an unconfirmed report.

## 3. Confirmed vs. claimed

State claims as claims with the claimant named. "Ministry X said Y" is a
fact about a statement, not about Y. Verifiers must check whether
independent confirmation exists and label the signal `confirmed`,
`reported`, or `disputed`.

## 4. Base rates first

Before assessing "is this event significant," ask "how often does this
class of event occur, and what usually follows?" Escalation announcements,
sanctions threats, coup rumors, and default warnings all have base rates;
analysis that ignores them is noise amplification.

## 5. Falsifiability

Every key judgment names what evidence would change it. Every prediction
names the exact data source and date that resolves it. If resolution
criteria cannot be written, the prediction is not made.

## 6. Red-team dissent is preserved

The daily brief's "What we might be getting wrong" section and the weekly
memo's refutation records are not editable by the synthesis agents. Dissent
travels with the conclusion.

## 7. Data discipline

- Numbers over adjectives: "PMI 47.1, third consecutive sub-50 print"
  beats "manufacturing is weakening".
- Every chart's underlying series carries an `as_of` date and source URL.
- Revisions matter: prefer the revision history of a statistic to its
  headline print.

## 8. Forecast scoring

- Primary metric: **Brier score** (mean squared error of probability vs.
  outcome, 0 best, lower is better; 0.25 = coin-flipping).
- **Calibration table:** predictions bucketed by stated probability vs.
  realized frequency.
- Scores are reported by lens (rates/FX, equities, commodities, geopolitics)
  so weak forecasting lenses are visible and can be fixed or retired.
- The weekly memo must open with the current scorecard. A system that
  hides its record is not rational; it is a marketing department.

## 9. Investment memo standards

- Every thesis: instrument, direction, horizon, entry logic, invalidation
  condition (a price or data level that proves it wrong), and the ledger
  IDs of the predictions it rests on.
- No thesis without a surviving prediction behind it.
- Standing disclaimer: research output, not individualized investment
  advice; position sizing suggestions assume risk capital only.
