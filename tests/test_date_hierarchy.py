import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from date_hierarchy import derive_dates


class DateHierarchyTests(unittest.TestCase):
    def test_primary_dates_are_preferred(self):
        result = derive_dates({"Início de Execução da Obra": "10/01/2020", "Data de Ordem de Serviço": "01/01/2020", "Data de Conclusão da Obra": "10/02/2020", "Término de Execução da Obra": "20/02/2020"})
        self.assertEqual(result["inicio"]["tipo"], "informada")
        self.assertEqual(result["fim"]["data"], "10/02/2020")
        self.assertEqual(result["situacao"], "coerente")

    def test_fallbacks_and_no_survey(self):
        result = derive_dates({"Data de Assinatura do Contrato": "01/01/2020", "Data da Vistoria Mais Recente": "05/03/2020", "Término de Execução da Obra Após Aditivo": "01/04/2020", "Término de Execução da Obra": "01/03/2020"})
        self.assertEqual(result["inicio"]["tipo"], "aproximada")
        self.assertEqual(result["fim"]["data"], "01/04/2020")
        self.assertEqual(result["fim"]["tipo"], "prazo")
        self.assertIsNone(derive_dates({"Data da Vistoria Mais Recente": "05/03/2020"})["fim"])

    def test_invalid_and_inconsistent_dates(self):
        result = derive_dates({"Início de Execução da Obra": "10/03/2020", "Data de Conclusão da Obra": "01/03/2020", "Término de Execução da Obra": "30/03/2020"})
        self.assertEqual(result["situacao"], "inconsistente")
        self.assertEqual(result["fim"]["data"], "01/03/2020")
        result = derive_dates({"Data de Ordem de Serviço": "31/02/2020", "Data de Assinatura do Contrato": "01/11/2025"})
        self.assertIsNone(result["inicio"])

    def test_fallback_must_respect_chronology(self):
        result = derive_dates({"Início de Execução da Obra": "10/03/2020", "Término de Execução da Obra Após Aditivo": "01/03/2020", "Término de Execução da Obra": "30/03/2020"})
        self.assertEqual(result["fim"]["data"], "30/03/2020")
        result = derive_dates({"Data de Ordem de Serviço": "10/03/2020", "Data de Assinatura do Contrato": "01/02/2020", "Data de Conclusão da Obra": "01/03/2020"})
        self.assertEqual(result["inicio"]["data"], "01/02/2020")


if __name__ == "__main__":
    unittest.main()
