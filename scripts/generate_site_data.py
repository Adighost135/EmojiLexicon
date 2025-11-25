from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

import emoji
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "Emoji_Lexicon_1.5.csv"
OUTPUT_DIR = ROOT / "docs" / "data"

SCORE_FIELDS: List[Tuple[str, int]] = [
    ("percent_very_neg", 1),
    ("percent_neg", 2),
    ("percent_somewhat_neg", 3),
    ("neu_ratio", 4),
    ("percent_somewhat_pos", 5),
    ("percent_pos", 6),
    ("percent_very_pos", 7),
]


def _rebalance_counts(values: List[float], target_total: int) -> List[int]:
    base = [int(v) for v in values]
    remainder = target_total - sum(base)

    if remainder > 0:
        order = sorted(
            enumerate(values),
            key=lambda pair: pair[1] - int(pair[1]),
            reverse=True,
        )
        idx = 0
        while remainder > 0 and order:
            i, _ = order[idx % len(order)]
            base[i] += 1
            remainder -= 1
            idx += 1
    elif remainder < 0:
        order = sorted(
            enumerate(values),
            key=lambda pair: pair[1] - int(pair[1]),
        )
        idx = 0
        while remainder < 0 and order:
            i, _ = order[idx % len(order)]
            if base[i] > 0:
                base[i] -= 1
                remainder += 1
            idx += 1

    return base


def _counts_from_row(row: pd.Series) -> Dict[int, int]:
    raw_values: List[float] = []
    for field, _ in SCORE_FIELDS:
        ratio = float(row[field])
        raw_values.append(ratio * row["count"])

    balanced = _rebalance_counts(raw_values, int(row["count"]))
    return {score: balanced[idx] for idx, (_, score) in enumerate(SCORE_FIELDS)}


def main() -> None:
    df = pd.read_csv(CSV_PATH)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summary_payload = []
    expanded_rows = []

    for _, row in df.iterrows():
        score_counts = _counts_from_row(row)

        emoji_name = emoji.demojize(row["emoji"]).strip(":").replace("_", " ")

        summary_payload.append(
            {
                "emoji": row["emoji"],
                "name": emoji_name,
                "sentiment_score": row["sentiment_score"],
                "count": int(row["count"]),
                "pos_ratio": row["pos_ratio"],
                "neg_ratio": row["neg_ratio"],
                "neu_ratio": row["neu_ratio"],
                "percent_very_pos": row["percent_very_pos"],
                "percent_pos": row["percent_pos"],
                "percent_somewhat_pos": row["percent_somewhat_pos"],
                "percent_very_neg": row["percent_very_neg"],
                "percent_neg": row["percent_neg"],
                "percent_somewhat_neg": row["percent_somewhat_neg"],
                "confidence_interval": row["confidence_interval"],
                "counts": score_counts,
            }
        )

        for score, count in score_counts.items():
            expanded_rows.extend({"emoji": row["emoji"], "score": score} for _ in range(count))

    (OUTPUT_DIR / "emoji_summary.json").write_text(
        json.dumps(summary_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (OUTPUT_DIR / "emoji_scores_expanded.json").write_text(
        json.dumps(expanded_rows, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Wrote {len(summary_payload)} summary rows and {len(expanded_rows)} expanded rows to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

