import os
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

import pandas as pd

from nasa_api.services.catalog import clear_catalog_cache, events_for_date


class CatalogServiceTests(TestCase):
    def setUp(self):
        self.temporary_directory = TemporaryDirectory()
        root = Path(self.temporary_directory.name)
        output = root / "data" / "processed"
        output.mkdir(parents=True)
        pd.DataFrame(
            [
                {
                    "month": "2026-01",
                    "fire_risk_score_proxy": 0.5,
                    "fire_evidence": "observed",
                    "fire_observed": True,
                    "firms_fire_count": 4,
                    "drought_score_proxy": float("nan"),
                    "drought_evidence": "proxy",
                    "flood_score_proxy": float("nan"),
                    "flood_evidence": "proxy",
                    "tectonic_score_proxy": float("nan"),
                    "tectonic_evidence": "no_confirmable",
                }
            ]
        ).to_parquet(output / "hazard_catalog.parquet", index=False)
        self.previous_root = os.environ.get("PIPELINE_DATA_ROOT")
        os.environ["PIPELINE_DATA_ROOT"] = str(root)
        clear_catalog_cache()

    def tearDown(self):
        clear_catalog_cache()
        if self.previous_root is None:
            os.environ.pop("PIPELINE_DATA_ROOT", None)
        else:
            os.environ["PIPELINE_DATA_ROOT"] = self.previous_root
        self.temporary_directory.cleanup()

    def test_only_events_with_valid_scores_or_observations_are_returned(self):
        events = events_for_date(date(2026, 1, 15))

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["properties"]["evidence"], "observed")
        self.assertTrue(events[0]["properties"]["observed"])

    def test_unknown_month_returns_no_events(self):
        self.assertEqual(events_for_date(date(2026, 2, 15)), [])
