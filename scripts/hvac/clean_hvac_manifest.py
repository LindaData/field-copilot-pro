#!/usr/bin/env python3
"""Clean HVAC source manifest CSV into normalized JSON.

Standard library only.
"""

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

VERSION = "0.1.0"
ALLOWED_TYPES = {"pdf", "html", "image", "spreadsheet", "manual", "unknown"}


def tidy(value):
    return " ".join(str(value or "").strip().split())


def model_key(value):
    return tidy(value).upper().replace(" ", "")


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def source_type(row):
    raw = tidy(row.get("source_type")).lower()
    if raw in ALLOWED_TYPES:
        return raw
    url = tidy(row.get("source_url")).lower()
    if url.endswith(".pdf"):
        return "pdf"
    if url:
        return "html"
    return "unknown"


def row_warnings(row):
    warnings = []
    if not tidy(row.get("manufacturer")):
        warnings.append("missing_manufacturer")
    if not tidy(row.get("model_number")):
        warnings.append("missing_model_number")
    if not tidy(row.get("source_url")):
        warnings.append("missing_source_url")
    if tidy(row.get("source_type")).lower() not in ALLOWED_TYPES:
        warnings.append("source_type_inferred")
    retrieved_at = tidy(row.get("retrieved_at"))
    if retrieved_at and not re.match(r"^\d{4}-\d{2}-\d{2}", retrieved_at):
        warnings.append("weak_retrieved_at")
    return warnings


def confidence(warnings):
    return max(0.15, round(0.85 - 0.10 * len(warnings), 2))


def clean_row(row, row_number):
    manufacturer = tidy(row.get("manufacturer"))
    model_number = tidy(row.get("model_number"))
    normalized = model_key(model_number)
    warnings = row_warnings(row)
    return {
        "model_id": f"hvac-{slug(manufacturer)}-{slug(normalized)}",
        "manufacturer": manufacturer,
        "model_number": model_number,
        "model_number_normalized": normalized,
        "series": tidy(row.get("series")),
        "unit_type": tidy(row.get("unit_type")),
        "document_title": tidy(row.get("document_title")),
        "document_date": tidy(row.get("document_date")),
        "source_name": tidy(row.get("source_name")),
        "source_url": tidy(row.get("source_url")),
        "source_type": source_type(row),
        "retrieved_at": tidy(row.get("retrieved_at")),
        "confidence": confidence(warnings),
        "notes": tidy(row.get("notes")),
        "lineage": {
            "raw_row_number": row_number,
            "cleaner_version": VERSION,
            "warnings": warnings,
        },
    }


def main_from_paths(input_value, out_value):
    input_path = Path(input_value)
    out_dir = Path(out_value)
    out_dir.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    records = [clean_row(row, i) for i, row in enumerate(rows, start=2)]
    summary = {
        "input_path": str(input_path),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cleaner_version": VERSION,
        "record_count": len(records),
        "warning_count": sum(len(r["lineage"]["warnings"]) for r in records),
    }

    (out_dir / "hvac_models.normalized.json").write_text(json.dumps(records, indent=2) + "\n")
    (out_dir / "hvac_cleaning_summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", default="data/hvac/normalized")
    args = parser.parse_args()
    print(json.dumps(main_from_paths(args.input, args.out_dir), indent=2))


if __name__ == "__main__":
    main()
