"""Transforma o retrato SIMEC em uma base pública reduzida de obras concluídas."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Relatorio SIMEC Geral - Out-2025.csv"
TARGET = ROOT / "public" / "obras.json"


def number(value):
    try:
        return float(value.strip().replace(".", "").replace(",", "."))
    except (ValueError, AttributeError):
        return None


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as f:
        rows = csv.DictReader(f, delimiter="\t")
        works = []
        for row in rows:
            if row.get("Situação da Obra", "").strip() != "Concluída":
                continue
            value = number(row.get("Valor Contratado da Obra (R$)", ""))
            area = number(row.get("Área/Quantidade a ser Construída", ""))
            unit = row.get("Unidade da Medida", "").strip()
            works.append({
                "key": str(len(works)),
                "id": row.get("ID", "").strip(),
                "name": row.get("Nome da Obra", "").strip(),
                "description": row.get("Descrição da Obra", "").strip(),
                "institution": row.get("Sigla", "").strip(),
                "university": row.get("Unidade", "").strip(),
                "campus": row.get("Campus", "").strip(),
                "state": row.get("UF", "").strip(),
                "city": row.get("Municipio", "").strip(),
                "type": row.get("Tipo da Obra", "").strip(),
                "typology": row.get("Tipologia", "").strip(),
                "unit": unit,
                "quantity": area,
                "value": value,
                "date": row.get("Data de Assinatura do Contrato", "").strip(),
                "completion": row.get("Data de Conclusão da Obra", "").strip(),
                "link": ("https:" + row["Link da Vistoria Mais Recente"]) if row.get("Link da Vistoria Mais Recente", "").startswith("//") else "",
            })
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(works, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(works)} obras concluídas exportadas para {TARGET}")


if __name__ == "__main__":
    main()
