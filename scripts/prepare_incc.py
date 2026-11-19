"""Valida e prepara a série INCC fornecida manualmente, sem alterar a fonte."""
import csv
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "INCC.csv"
TARGET = ROOT / "public" / "incc.json"
MONTHS = ("JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ")


def decimal_br(value):
    return Decimal(value.strip().replace(".", "").replace(",", "."))


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        expected = {"Mês (número)", "Ano", "Mês", "Índice", "Var% Mês"}
        if not expected.issubset(reader.fieldnames or []):
            raise ValueError("O CSV não contém as colunas esperadas.")
        records = []
        seen = set()
        for line, row in enumerate(reader, 2):
            try:
                month, year = int(row["Mês (número)"]), int(row["Ano"])
                date(year, month, 1)
                if row["Mês"].strip().upper() != MONTHS[month - 1]:
                    raise ValueError("nome e número do mês não coincidem")
                index = decimal_br(row["Índice"])
                variation = decimal_br(row["Var% Mês"].replace("%", "")) if row["Var% Mês"].strip() else None
                if not index.is_finite() or index <= 0 or (variation is not None and not variation.is_finite()):
                    raise ValueError("índice ou variação inválida")
            except (ValueError, InvalidOperation) as exc:
                raise ValueError(f"Linha {line}: {exc}") from exc
            period = f"{year:04d}-{month:02d}"
            if period in seen:
                raise ValueError(f"Mês duplicado: {period}")
            seen.add(period)
            records.append({"periodo": period, "indice": float(index), "variacao_informada": float(variation) if variation is not None else None})

    records.sort(key=lambda r: r["periodo"])
    if not records:
        raise ValueError("Nenhum registro encontrado.")
    start = int(records[0]["periodo"][:4]) * 12 + int(records[0]["periodo"][5:])
    end = int(records[-1]["periodo"][:4]) * 12 + int(records[-1]["periodo"][5:])
    expected_periods = {f"{(i-1)//12:04d}-{(i-1)%12+1:02d}" for i in range(start, end + 1)}
    missing = sorted(expected_periods - seen)
    discrepancies = []
    for previous, current in zip(records, records[1:]):
        if current["variacao_informada"] is not None:
            calculated = (current["indice"] / previous["indice"] - 1) * 100
            if abs(calculated - current["variacao_informada"]) > 0.025:
                discrepancies.append({"periodo": current["periodo"], "variacao_informada": current["variacao_informada"], "variacao_calculada": round(calculated, 4)})

    result = {
        "nome": "INCC (série fornecida manualmente)",
        "fonte": "INCC.csv fornecido pelo usuário; fonte original e variante não informadas",
        "situacao": "provisoria; índices e divergências ainda não verificados na fonte original",
        "primeiro_periodo": records[0]["periodo"],
        "ultimo_periodo": records[-1]["periodo"],
        "meses_ausentes": missing,
        "divergencias": discrepancies,
        "registros": records,
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(records)} meses; {len(missing)} ausentes; {len(discrepancies)} divergências. Arquivo: {TARGET}")


if __name__ == "__main__":
    main()
