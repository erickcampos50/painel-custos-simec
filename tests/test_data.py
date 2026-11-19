import csv
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class DataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / "Relatorio SIMEC Geral - Out-2025.csv").open(encoding="utf-8-sig", newline="") as f:
            cls.source = list(csv.DictReader(f, delimiter="\t"))
        cls.works = json.loads((ROOT / "public" / "obras.json").read_text(encoding="utf-8"))

    def test_only_completed_and_no_silent_deduplication(self):
        expected = [row for row in self.source if row["Situação da Obra"].strip() == "Concluída"]
        self.assertEqual(len(self.works), len(expected))
        self.assertEqual([w["id"] for w in self.works], [row["ID"].strip() for row in expected])

    def test_numeric_fields_and_units(self):
        candidates = [w for w in self.works if w["value"] and w["value"] > 0 and w["quantity"] and w["quantity"] > 0 and w["unit"] == "m2"]
        self.assertEqual(len(candidates), 6071)

    def test_json_excludes_contact_and_company_fields(self):
        self.assertTrue(self.works)
        self.assertNotIn("email", self.works[0])
        self.assertNotIn("CNPJ Empresa Contratada", self.works[0])


if __name__ == "__main__":
    unittest.main()
