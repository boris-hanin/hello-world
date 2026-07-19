#!/usr/bin/env python3
"""Score the prediction ledger.

Usage:
  python3 pdb/tools/backtest.py due --date YYYY-MM-DD   # open predictions whose resolution_date has passed
  python3 pdb/tools/backtest.py score                    # Brier, calibration, hit rates from resolutions
  python3 pdb/tools/backtest.py score --json             # same, machine-readable

Ledger files (append-only JSONL):
  pdb/ledger/predictions.jsonl   objects per schemas/prediction.schema.json
  pdb/ledger/resolutions.jsonl   {"id": ..., "resolved_date": ..., "observed_value": ...,
                                  "outcome": true|false, "note": ..., "source_url": ...}

Only stdlib. Scoring convention: outcome=true means the predicted condition
held at resolution. Brier = mean((probability - outcome)^2); 0 is perfect,
0.25 is coin-flipping on 50/50 claims.
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PREDICTIONS = ROOT / "ledger" / "predictions.jsonl"
RESOLUTIONS = ROOT / "ledger" / "resolutions.jsonl"

CALIBRATION_BINS = [(0.0, 0.2), (0.2, 0.45), (0.45, 0.55), (0.55, 0.8), (0.8, 1.01)]


def read_jsonl(path):
    if not path.exists():
        return []
    rows = []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"warning: {path.name}:{i} unparseable, skipped ({e})", file=sys.stderr)
    return rows


def cmd_due(date):
    preds = read_jsonl(PREDICTIONS)
    resolved_ids = {r["id"] for r in read_jsonl(RESOLUTIONS)}
    due = [
        p for p in preds
        if p.get("id") not in resolved_ids
        and p.get("status", "open") == "open"
        and p.get("resolution_date", "9999") <= date
    ]
    for p in due:
        print(json.dumps(p))
    print(f"\n{len(due)} prediction(s) due for resolution as of {date}", file=sys.stderr)
    return due


def cmd_score(as_json=False):
    preds = {p["id"]: p for p in read_jsonl(PREDICTIONS) if "id" in p}
    resolutions = read_jsonl(RESOLUTIONS)
    joined = []
    for r in resolutions:
        p = preds.get(r.get("id"))
        if p is None:
            print(f"warning: resolution for unknown prediction id {r.get('id')!r}", file=sys.stderr)
            continue
        if not isinstance(r.get("outcome"), bool):
            continue
        joined.append((p, r))

    if not joined:
        result = {"n_resolved": 0, "note": "no resolved predictions yet"}
        print(json.dumps(result, indent=2) if as_json else "No resolved predictions yet — nothing to score.")
        return result

    def brier(pairs):
        return sum((p["probability"] - (1.0 if r["outcome"] else 0.0)) ** 2 for p, r in pairs) / len(pairs)

    def hit_rate(pairs):
        # a "hit" = the >=50% side of the forecast matched the outcome
        hits = sum(1 for p, r in pairs if (p["probability"] >= 0.5) == r["outcome"])
        return hits / len(pairs)

    by_lens = defaultdict(list)
    for p, r in joined:
        by_lens[p.get("lens", "unknown")].append((p, r))

    calibration = []
    for lo, hi in CALIBRATION_BINS:
        bucket = [(p, r) for p, r in joined if lo <= p["probability"] < hi]
        if bucket:
            calibration.append({
                "bin": f"{lo:.2f}-{min(hi, 1.0):.2f}",
                "n": len(bucket),
                "mean_stated": sum(p["probability"] for p, _ in bucket) / len(bucket),
                "realized_freq": sum(1 for _, r in bucket if r["outcome"]) / len(bucket),
            })

    result = {
        "n_resolved": len(joined),
        "brier": round(brier(joined), 4),
        "hit_rate": round(hit_rate(joined), 4),
        "by_lens": {
            lens: {"n": len(pairs), "brier": round(brier(pairs), 4), "hit_rate": round(hit_rate(pairs), 4)}
            for lens, pairs in sorted(by_lens.items())
        },
        "calibration": calibration,
    }

    if as_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Resolved predictions: {result['n_resolved']}")
        print(f"Brier score:          {result['brier']}  (0 perfect, 0.25 = coin flip)")
        print(f"Hit rate:             {result['hit_rate']:.0%}")
        print("\nBy lens:")
        for lens, s in result["by_lens"].items():
            print(f"  {lens:20s} n={s['n']:<4d} brier={s['brier']:<8g} hit={s['hit_rate']:.0%}")
        print("\nCalibration (stated vs realized):")
        for row in calibration:
            print(f"  {row['bin']:12s} n={row['n']:<4d} stated={row['mean_stated']:.2f} realized={row['realized_freq']:.2f}")
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_due = sub.add_parser("due", help="list open predictions past their resolution date")
    p_due.add_argument("--date", required=True, help="YYYY-MM-DD to evaluate against")
    p_score = sub.add_parser("score", help="score resolved predictions")
    p_score.add_argument("--json", action="store_true")
    args = ap.parse_args()
    if args.cmd == "due":
        cmd_due(args.date)
    else:
        cmd_score(as_json=args.json)


if __name__ == "__main__":
    main()
