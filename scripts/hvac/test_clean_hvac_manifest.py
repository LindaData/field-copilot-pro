#!/usr/bin/env python3
"""Basic tests for clean_hvac_manifest.py.

Run:
  python scripts/hvac/test_clean_hvac_manifest.py
"""

import csv
import json
import tempfile
import unittest
from pathlib import Path

import clean_hvac_manifest


class CleanHvacManifestTests(unittest.TestCase):
    def test_clean_sample_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            manifest = tmp_path / "manifest.csv"
            out_dir = tmp_path / "out"

            with manifest.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(
                    handle,
                    fieldnames=[
                        "manufacturer",
                        "model_number",
                        "series",
                        "unit_type",
                        "document_title",
                        "document_date",
                        "source_name",
                        "source_url",
                        "source_type",
                        "retrieved_at",
                        "notes",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "manufacturer": " Goodman ",
                        "model_number": " gsxn3 ",
                        "series": "GSXN3",
                        "unit_type": "air conditioner",
                        "document_title": "Spec sheet",
                        "document_date": "",
                        "source_name": "Goodman",
                        "source_url": "https://example.test/ss-gsxn3.pdf",
                        "source_type": "pdf",
                        "retrieved_at": "2026-06-29",
                        "notes": "sample",
                    }
                )

            clean_hvac_manifest.main_from_paths(str(manifest), str(out_dir))

            records = json.loads((out_dir / "hvac_models.normalized.json").read_text())
            summary = json.loads((out_dir / "hvac_cleaning_summary.json").read_text())

            self.assertEqual(summary["record_count"], 1)
            self.assertEqual(records[0]["manufacturer"], "Goodman")
            self.assertEqual(records[0]["model_number_normalized"], "GSXN3")
            self.assertEqual(records[0]["source_type"], "pdf")

    def test_missing_fields_warn(self):
        row = {
            "manufacturer": "",
            "model_number": "",
            "source_url": "",
            "source_type": "",
            "retrieved_at": "not-a-date",
        }
        warnings = clean_hvac_manifest.row_warnings(row)
        self.assertIn("missing_manufacturer", warnings)
        self.assertIn("missing_model_number", warnings)
        self.assertIn("missing_source_url", warnings)
        self.assertLess(clean_hvac_manifest.confidence(warnings), 0.85)


if __name__ == "__main__":
    unittest.main()
