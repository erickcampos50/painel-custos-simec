import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class InccTests(unittest.TestCase):
    def test_coverage_and_audit(self):
        data = json.loads((ROOT / "public" / "incc.json").read_text(encoding="utf-8"))
        self.assertEqual(data["primeiro_periodo"], "1995-01")
        self.assertEqual(data["ultimo_periodo"], "2025-08")
        self.assertEqual(len(data["registros"]), 368)
        self.assertEqual(data["meses_ausentes"], [])
        self.assertEqual([d["periodo"] for d in data["divergencias"]], ["2006-01", "2015-06", "2016-01", "2018-01"])
        self.assertEqual(data["registros"][-1]["indice"], 1216.71)


if __name__ == "__main__":
    unittest.main()
