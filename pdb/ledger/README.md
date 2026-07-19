# Prediction ledger

Append-only JSONL files. Never edit or delete existing lines — the ledger is
only backtestable if history is immutable. Corrections happen by appending
(e.g. a resolution with `"voided": true` and a note).

- `predictions.jsonl` — one prediction per line, per `../schemas/prediction.schema.json`
- `resolutions.jsonl` — one outcome per line:
  `{"id", "resolved_date", "observed_value", "outcome": true|false, "note", "source_url"}`

Score with `python3 pdb/tools/backtest.py score`.
