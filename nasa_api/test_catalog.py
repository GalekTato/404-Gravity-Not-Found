import os
from datetime import date
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from xml.etree import ElementTree
from zipfile import ZipFile

import pandas as pd

from nasa_api.services.catalog import (
    clear_catalog_cache,
    events_for_date,
    events_for_period,
    model_metrics_summary,
    timemap_summary,
)
from nasa_api.services.excel import export_workbook


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

    def test_state_filter_does_not_return_national_fallback(self):
        self.assertEqual(events_for_date(date(2026, 1, 15), state_clave="12"), [])

    def test_excel_preserves_text_without_formulas(self):
        event = events_for_date(date(2026, 1, 15))[0]
        event["properties"]["name"] = '=HYPERLINK("https://example.com")'
        with ZipFile(BytesIO(export_workbook([event]))) as workbook:
            sheet = ElementTree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
            namespace = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            self.assertEqual(len(sheet.findall("s:sheetData/s:row", namespace)), 2)
            self.assertEqual(sheet.findall(".//s:f", namespace), [])
            cell = sheet.find('.//s:c[@r="G2"]/s:is/s:t', namespace)
            self.assertIsNotNone(cell)
            self.assertEqual(cell.text, event["properties"]["name"])

    def test_model_metrics_summary_structure(self):
        summary = model_metrics_summary()
        self.assertTrue(summary["available"])
        self.assertEqual(summary["database_engine"], "postgresql")
        self.assertGreaterEqual(len(summary["models"]), 3)

    def test_spatial_catalog_and_timemap_multi_state(self):
        output = Path(self.temporary_directory.name) / "data" / "processed"
        pd.DataFrame(
            [
                {
                    "event_id": "sismo-2026-01-12",
                    "period": "2026-01",
                    "date": "2026-01-02",
                    "hazard_type": "sismo",
                    "name": "Sismo M6.5 · San Marcos, Guerrero",
                    "state_clave": "12",
                    "state_name": "Guerrero",
                    "longitude": -99.38,
                    "latitude": 16.79,
                    "severity": 6.5,
                    "radius_km": 95,
                    "score": 6.5,
                    "probability": 1.0,
                    "evidence": "observed",
                    "observed": True,
                    "source": "USGS",
                },
                {
                    "event_id": "inundacion-2026-01-27",
                    "period": "2026-01",
                    "date": "2026-01-15",
                    "hazard_type": "inundacion",
                    "name": "Riesgo de inundación · Tabasco",
                    "state_clave": "27",
                    "state_name": "Tabasco",
                    "longitude": -92.93,
                    "latitude": 17.98,
                    "severity": 7.8,
                    "radius_km": 85,
                    "score": 1.85,
                    "probability": 0.86,
                    "evidence": "supervised",
                    "observed": False,
                    "source": "GPM + GLDAS",
                },
            ]
        ).to_parquet(output / "spatial_hazard_catalog.parquet", index=False)
        clear_catalog_cache()

        events = events_for_period("2026-01")
        self.assertEqual(len(events), 2)
        states = {e["properties"]["state_name"] for e in events}
        self.assertEqual(states, {"Guerrero", "Tabasco"})

        summary = timemap_summary()
        self.assertTrue(summary["available"])
        self.assertEqual(summary["total_events"], 2)
        self.assertEqual(summary["states_covered"], 2)
        self.assertEqual(summary["markers"][0]["states_affected"], 2)
