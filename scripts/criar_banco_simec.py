"""Cria um SQLite local com todas as colunas das obras concluídas do SIMEC."""
import argparse
from contextlib import closing
import csv
import os
import sqlite3
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Relatorio SIMEC Geral - Out-2025.csv"
TARGET = ROOT / "dados" / "simec_concluidas.sqlite"


def identifier(name):
    return '"' + name.replace('"', '""') + '"'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=SOURCE, help="CSV de origem")
    parser.add_argument("--saida", type=Path, default=TARGET, help="Arquivo SQLite de saída")
    args = parser.parse_args()
    source = args.csv.resolve()
    target = args.saida.resolve()
    if source == target:
        parser.error("O arquivo de saída não pode ser o CSV de origem.")
    if target.is_relative_to((ROOT / "public").resolve()):
        parser.error("Não coloque o banco no diretório público do frontend.")

    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=".simec-", suffix=".sqlite", dir=target.parent)
    os.close(fd)
    try:
        with source.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.reader(stream, delimiter="\t")
            headers = next(reader)
            if not headers or any(not h for h in headers):
                raise ValueError("O CSV contém cabeçalhos vazios.")
            if len({h.lower() for h in headers}) != len(headers):
                raise ValueError("O CSV contém cabeçalhos duplicados para o SQLite.")
            status_index = headers.index("Situação da Obra")
            columns = ", ".join(identifier(h) for h in headers)
            placeholders = ", ".join("?" for _ in headers)
            count = 0
            with closing(sqlite3.connect(temp_name)) as db, db:
                db.execute("CREATE TABLE obras (" + ", ".join(
                    identifier(h) + " TEXT" for h in headers
                ) + ")")
                for row in reader:
                    if len(row) != len(headers):
                        raise ValueError("Número de colunas inválido próximo à linha {}".format(reader.line_num))
                    if row[status_index].strip() == "Concluída":
                        db.execute("INSERT INTO obras ({}) VALUES ({})".format(columns, placeholders), row)
                        count += 1
                stored = db.execute("SELECT COUNT(*) FROM obras").fetchone()[0]
                if stored != count:
                    raise RuntimeError("A contagem armazenada não corresponde à importada.")
        os.replace(temp_name, target)
        print("{} registros concluídos gravados em {}".format(count, target))
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)


if __name__ == "__main__":
    main()
