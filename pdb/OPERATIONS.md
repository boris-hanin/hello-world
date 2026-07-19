# Operations

## Running manually (in a Claude Code session on this repo)

Daily brief (date is required — workflow scripts cannot read the clock):

    Workflow({ scriptPath: ".claude/workflows/daily-briefing.mjs",
               args: { date: "YYYY-MM-DD", scale: "full" } })

Weekly memo:

    Workflow({ scriptPath: ".claude/workflows/weekly-investment.mjs",
               args: { date: "YYYY-MM-DD" } })

Or just ask: "run the daily briefing workflow for today" / "run the weekly
investment workflow". `scale: "pilot"` runs a cheaper 7-beat version of the
daily brief for testing.

Outputs land in `pdb/briefings/<date>/` and `pdb/weekly/<date>/` as
`brief.md` + `brief.html` (and `memo.md`/`memo.html` + `scorecard.json`).
The HTML files are fully self-contained and are meant to be published as an
Artifact (or opened directly) for reading.

## Scheduling

Two Routines (Claude Code Remote scheduled triggers) drive the system; each
firing spawns a fresh session in this environment:

- **PDB daily briefing** — every day, morning UTC. Prompt: check out the
  working branch, run the daily workflow at full scale for today's date,
  commit/push the outputs, publish `brief.html` as an artifact.
- **PDB weekly investment memo** — Fridays after US market close. Same
  pattern with the weekly workflow (which first resolves due predictions
  and refreshes the scorecard).

Manage them with the trigger tools (`list_triggers`, `update_trigger`,
`delete_trigger`) from any session in this environment — e.g. to change the
hour, pause during travel, or switch push/email notifications.

**Branch note:** scheduled sessions clone the default branch. Until the PDB
branch is merged, the trigger prompts explicitly fetch and check out
`claude/agentic-pdb-workflow-cdndir`. After merging to the default branch,
that step becomes a no-op but is harmless.

## Cost and tuning

A full daily run spawns roughly 30–40 agents (12 collectors, 1 triage,
10 verify + 10 context, 2 synthesis, 1 writer); pilot scale roughly halves
that. The weekly run is ~25 agents, dominated by the 3-refuters-per-
prediction panel. Tune knobs at the top of each script: `TOP_N`, `PER_BEAT`,
beat list, lens list, refuter angles.

## Failure modes

- **"No signals collected"** — network/search access failed in collectors;
  re-run. The workflow journal (`journal.jsonl` in the run's transcript dir)
  records each agent's actual return.
- **All predictions refuted** — legitimate outcome in a quiet week; the
  weekly workflow stops rather than shipping unsupported theses. Read the
  refuter arguments in the journal.
- **Ledger discipline** — both workflows only append to `pdb/ledger/*.jsonl`.
  If a scheduled run ever rewrites ledger history, that is a bug; the git
  history of the ledger files is the audit trail.
