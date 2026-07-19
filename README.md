# PDB — automated open-source daily briefing + weekly macro forecasts

An agentic pipeline that produces a presidential-style daily briefing from
open-source intelligence, and a weekly, ledger-backed, backtestable set of
short-term macro predictions mapped to investment theses.

- Start here: [`pdb/ARCHITECTURE.md`](pdb/ARCHITECTURE.md)
- Analytic standards: [`pdb/METHODOLOGY.md`](pdb/METHODOLOGY.md)
- Running & scheduling: [`pdb/OPERATIONS.md`](pdb/OPERATIONS.md)
- Workflows: [`.claude/workflows/daily-briefing.mjs`](.claude/workflows/daily-briefing.mjs),
  [`.claude/workflows/weekly-investment.mjs`](.claude/workflows/weekly-investment.mjs)
- Track record: `python3 pdb/tools/backtest.py score`

Ethos: skeptical, pragmatic, rational. Every judgment carries a probability;
every source carries a grade; every forecast is a ledger entry that gets
scored; red-team dissent ships unedited in every brief.
