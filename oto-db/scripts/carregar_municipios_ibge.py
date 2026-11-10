#!/usr/bin/env python3
"""Gera db/seeds/S03_municipios.sql com os 5.570 municípios do IBGE.

Usa apenas a biblioteca padrão. Rode UMA vez, numa máquina com internet:

    python3 scripts/carregar_municipios_ibge.py
    ./scripts/bootstrap.sh            # aplica o seed (ou: make seed)

Fonte: API de Localidades do IBGE (servicodados.ibge.gov.br).
Para uso offline, baixe o JSON de
https://servicodados.ibge.gov.br/api/v1/localidades/municipios e passe com --arquivo-json.
"""
import argparse, json, sys, urllib.request
from pathlib import Path

URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
UFS = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())


def uf_do_registro(m: dict):
    """A UF mora em caminhos diferentes conforme a região de referência (alguns municípios
    têm microrregiao nula na API)."""
    for caminho in (("microrregiao", "mesorregiao", "UF"),
                    ("regiao-imediata", "regiao-intermediaria", "UF")):
        no = m
        for chave in caminho:
            no = no.get(chave) if isinstance(no, dict) else None
        if isinstance(no, dict) and no.get("sigla"):
            return no["sigla"]
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--saida", default=str(Path(__file__).resolve().parent.parent / "db/seeds/S03_municipios.sql"))
    ap.add_argument("--arquivo-json", help="usa um JSON local em vez de chamar a API")
    ap.add_argument("--minimo", type=int, default=5500, help="falha se vier menos municípios que isso")
    a = ap.parse_args()

    if a.arquivo_json:
        dados = json.loads(Path(a.arquivo_json).read_text(encoding="utf-8"))
    else:
        req = urllib.request.Request(URL, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            dados = json.load(r)

    linhas, vistos, problemas = [], set(), []
    for m in dados:
        cod, nome, uf = int(m["id"]), m["nome"], uf_do_registro(m)
        if uf not in UFS:
            problemas.append(f"{cod} {nome}: UF não identificada ({uf!r})")
            continue
        if cod in vistos:
            continue
        vistos.add(cod)
        linhas.append((cod, nome.replace("'", "''"), uf))

    if problemas:
        print("ATENÇÃO:\n  " + "\n  ".join(problemas), file=sys.stderr)
    if len(linhas) < a.minimo:
        sys.exit(f"Só {len(linhas)} municípios válidos (mínimo {a.minimo}). Nada foi gravado.")

    linhas.sort()
    corpo = ",\n".join(f"    ({c}, '{n}', '{u}')" for c, n, u in linhas)
    Path(a.saida).write_text(
        "-- S03 - Municípios (IBGE). Gerado por scripts/carregar_municipios_ibge.py. Idempotente.\n"
        "SET search_path = oto, public;\n"
        f"INSERT INTO municipio (codigo_ibge, nome, uf_sigla) VALUES\n{corpo}\n"
        "ON CONFLICT (codigo_ibge) DO UPDATE SET nome = EXCLUDED.nome, uf_sigla = EXCLUDED.uf_sigla;\n",
        encoding="utf-8")
    print(f"{len(linhas)} municípios gravados em {a.saida}")


if __name__ == "__main__":
    main()
