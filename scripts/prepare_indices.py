"""Importa séries FGV de Indices.csv para JSON e, opcionalmente, SQLite."""
import argparse
import csv
import json
import re
import sqlite3
from contextlib import closing
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Indices.csv"
URL = "https://extra-ibre.fgv.br/IBRE/sitefgvdados/visualizaconsulta.aspx"
SERIES = {
    "incc": ("INCC-Brasil-DI-Todos os itens(1464783)", "INCC-Brasil-DI - Todos os itens", "1464783"),
    "igpm": ("Índice Geral de Preços - IGP-M(200045)", "Índice Geral de Preços - IGP-M", "200045"),
}


def parse_indices(path):
    with path.open(encoding="cp1252", newline="") as stream:
        reader = csv.DictReader(stream, delimiter=";")
        expected = {"Data", *(s[0] for s in SERIES.values())}
        if set(reader.fieldnames or []) != expected:
            raise ValueError("Cabeçalho inesperado; confira as séries e os códigos no arquivo.")
        result = {key: [] for key in SERIES}
        seen = set()
        for line, row in enumerate(reader, 2):
            if None in row or any(v is None for v in row.values()):
                raise ValueError(f"Linha {line}: número de colunas inválido.")
            match = re.fullmatch(r"(\d{2})/(\d{4})", row["Data"].strip())
            if not match:
                raise ValueError(f"Linha {line}: período inválido.")
            month, year = map(int, match.groups())
            date(year, month, 1)
            period = f"{year:04d}-{month:02d}"
            if period in seen:
                raise ValueError(f"Período duplicado: {period}")
            seen.add(period)
            for key, (column, _, _) in SERIES.items():
                raw = row[column].strip()
                if raw in ("", "-"):
                    continue
                try:
                    value = Decimal(raw.replace(".", "").replace(",", "."))
                    if not value.is_finite() or value <= 0:
                        raise ValueError("índice deve ser positivo e finito")
                except (InvalidOperation, ValueError) as exc:
                    raise ValueError(f"Linha {line}, série {key}: índice inválido.") from exc
                result[key].append({"periodo": period, "indice": float(value)})
    output = {}
    for key, (_, name, code) in SERIES.items():
        records = sorted(result[key], key=lambda r: r["periodo"])
        if not records:
            raise ValueError(f"Série {key} sem registros.")
        start = int(records[0]["periodo"][:4]) * 12 + int(records[0]["periodo"][5:])
        end = int(records[-1]["periodo"][:4]) * 12 + int(records[-1]["periodo"][5:])
        present = {r["periodo"] for r in records}
        missing = [f"{(i - 1) // 12:04d}-{(i - 1) % 12 + 1:02d}" for i in range(start, end + 1) if f"{(i - 1) // 12:04d}-{(i - 1) % 12 + 1:02d}" not in present]
        output[key] = {
            "nome": name, "codigo_fgv": code, "fonte": "FGV IBRE / FGV Dados, arquivo fornecido pelo usuário",
            "url_fonte": URL, "arquivo_origem": path.name,
            "primeiro_periodo": records[0]["periodo"], "ultimo_periodo": records[-1]["periodo"],
            "meses_ausentes": missing, "registros": records,
        }
    return output


def update_sqlite(path, series):
    if not path.is_file():
        raise FileNotFoundError(f"Banco não encontrado: {path}")
    with closing(sqlite3.connect(path)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS series_indices (codigo TEXT PRIMARY KEY, nome TEXT NOT NULL, codigo_fgv TEXT NOT NULL, fonte TEXT NOT NULL, url_fonte TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS indices_mensais (serie TEXT NOT NULL, periodo TEXT NOT NULL, indice REAL NOT NULL CHECK(indice > 0), PRIMARY KEY (serie, periodo), FOREIGN KEY (serie) REFERENCES series_indices(codigo))")
        for key, data in series.items():
            db.execute("INSERT OR REPLACE INTO series_indices VALUES (?, ?, ?, ?, ?)", (key, data["nome"], data["codigo_fgv"], data["fonte"], data["url_fonte"]))
            db.execute("DELETE FROM indices_mensais WHERE serie = ?", (key,))
            db.executemany("INSERT INTO indices_mensais VALUES (?, ?, ?)", ((key, r["periodo"], r["indice"]) for r in data["registros"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=SOURCE)
    parser.add_argument("--sqlite", type=Path, help="Atualiza também as tabelas de índices no banco local existente")
    args = parser.parse_args()
    series = parse_indices(args.csv)
    if args.sqlite:
        update_sqlite(args.sqlite, series)
    for key, data in series.items():
        (ROOT / "public" / f"{key}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{data['nome']}: {len(data['registros'])} meses, {data['primeiro_periodo']} a {data['ultimo_periodo']}, {len(data['meses_ausentes'])} ausentes.")


if __name__ == "__main__":
    main()
