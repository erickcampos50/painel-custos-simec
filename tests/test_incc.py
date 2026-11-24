import csv
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from scripts.prepare_indices import parse_indices, update_sqlite, SERIES

ROOT = Path(__file__).resolve().parent.parent


class IndexTests(unittest.TestCase):
    def test_generated_coverage_and_values_match_source(self):
        series = parse_indices(ROOT / "Indices.csv")
        for key, start, count, latest in (("incc", "1996-07", 364, 1304.539), ("igpm", "1989-06", 449, 1243.905)):
            data = json.loads((ROOT / "public" / f"{key}.json").read_text(encoding="utf-8"))
            self.assertEqual(data, series[key])
            self.assertEqual((data["primeiro_periodo"], data["ultimo_periodo"]), (start, "2026-10"))
            self.assertEqual(len(data["registros"]), count)
            self.assertEqual(data["meses_ausentes"], [])
            self.assertEqual(data["registros"][-1]["indice"], latest)
        self.assertAlmostEqual(series["igpm"]["registros"][0]["indice"], 0.0000308619)

    def test_duplicate_period_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "Indices.csv"
            with path.open("w", encoding="cp1252", newline="") as stream:
                writer = csv.writer(stream, delimiter=";")
                writer.writerow(["Data", *(item[0] for item in SERIES.values())])
                writer.writerows([["01/2020", "100,5", "200,5"]] * 2)
            with self.assertRaisesRegex(ValueError, "duplicado"):
                parse_indices(path)

    def test_sqlite_preserves_works_and_refreshes_only_indices(self):
        with tempfile.TemporaryDirectory() as temp:
            db = Path(temp) / "test.sqlite"
            with closing(sqlite3.connect(db)) as conn, conn:
                conn.execute("CREATE TABLE obras (nome TEXT)")
                conn.execute("INSERT INTO obras VALUES ('preservada')")
            data = parse_indices(ROOT / "Indices.csv")
            update_sqlite(db, data)
            update_sqlite(db, data)
            with closing(sqlite3.connect(db)) as conn:
                self.assertEqual(conn.execute("SELECT nome FROM obras").fetchone()[0], "preservada")
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM indices_mensais").fetchone()[0], 813)
                self.assertEqual(conn.execute("SELECT indice FROM indices_mensais WHERE serie='igpm' AND periodo='2026-10'").fetchone()[0], 1243.905)


if __name__ == "__main__":
    unittest.main()
