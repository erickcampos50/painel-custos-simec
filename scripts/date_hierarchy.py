"""Deriva datas de execução sem tratar vistoria ou prazo como conclusão efetiva."""
from datetime import date, datetime

SNAPSHOT_END = date(2025, 10, 31)  # O dia de extração não foi informado.
START_FIELDS = (
    ("Início de Execução da Obra", "informada"),
    ("Data de Ordem de Serviço", "aproximada"),
    ("Data de Assinatura do Contrato", "aproximada"),
)
END_FIELDS = (
    ("Data de Conclusão da Obra", "informada"),
    ("Término de Execução da Obra Após Aditivo", "prazo"),
    ("Data de término da execução da obra após Aditivo", "prazo"),
    ("Término de Execução da Obra", "prazo"),
)


def parse_date(value):
    for fmt in ("%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime((value or "").strip(), fmt).date()
            return parsed if date(1900, 1, 1) <= parsed <= SNAPSHOT_END else None
        except ValueError:
            continue
    return None


def first_valid(row, fields, not_before=None, not_after=None):
    for field, kind in fields:
        value = parse_date(row.get(field, ""))
        if value and (not_before is None or value >= not_before) and (not_after is None or value <= not_after):
            return {"data": value.strftime("%d/%m/%Y"), "fonte": field, "tipo": kind}
    return None


def derive_dates(row):
    start_primary = first_valid(row, START_FIELDS[:1])
    end_primary = first_valid(row, END_FIELDS[:1])
    start_date = parse_date(start_primary["data"]) if start_primary else None
    end_date = parse_date(end_primary["data"]) if end_primary else None

    # Não esconder uma contradição entre duas datas originais substituindo-as.
    if start_date and end_date and end_date < start_date:
        return {"inicio": start_primary, "fim": end_primary, "situacao": "inconsistente"}

    start = start_primary or first_valid(row, START_FIELDS[1:], not_after=end_date)
    start_date = parse_date(start["data"]) if start else None
    end = end_primary or first_valid(row, END_FIELDS[1:], not_before=start_date)
    status = "coerente" if start and end else "incompleta"
    return {"inicio": start, "fim": end, "situacao": status}
