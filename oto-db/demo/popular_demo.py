#!/usr/bin/env python3
"""Popula um banco de DEMONSTRAÇÃO com pesquisas fictícias, enviando-as pelo mesmo endpoint do app.

    python3 demo/popular_demo.py [--url http://localhost:3000] [--total 700] [--semente 42]

Pré-requisitos: o painel rodando e apontado para o banco de demonstração (ver demo/README.md).
Os dados são 100% inventados (nenhum turista real) e seguem o questionário do app, então passam pela
mesma validação, conversão e auditoria de uma coleta de verdade. Datas retroativas: jan a nov/2026.
"""
import argparse, json, os, random, urllib.parse, urllib.request, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
QUESTIONARIO = RAIZ.parent / "android-app-olimpia/assets/seed/questionnaire.json"

PESQUISADORES = [  # (código, local, peso)
    ("OTO482", "Thermas dos Laranjais", 0.45),
    ("OTO117", "Hot Beach Olímpia", 0.35),
    ("OTO305", "Praça da Matriz", 0.20),
]
# Sazonalidade: férias de julho e fim de ano mais fortes
PESO_MES = {1: 8, 2: 7, 3: 6, 4: 7, 5: 6, 6: 7, 7: 13, 8: 9, 9: 7, 10: 10, 11: 11}
CIDADES = {  # UF -> cidades de origem prováveis
    "SP": ["São Paulo", "Campinas", "Ribeirão Preto", "São José do Rio Preto", "Bauru", "Marília", "Araraquara", "Sorocaba", "Santos"],
    "MG": ["Belo Horizonte", "Uberlândia", "Uberaba", "Contagem", "Juiz de Fora"],
    "PR": ["Curitiba", "Londrina", "Maringá"],
    "RJ": ["Rio de Janeiro", "Niterói"],
    "GO": ["Goiânia"],
    "SC": ["Florianópolis", "Joinville"],
    "DF": ["Brasília"],
    "MS": ["Campo Grande"],
    "RS": ["Porto Alegre"],
    "BA": ["Salvador"],
}
PESO_UF = {"SP": 42, "MG": 20, "PR": 12, "RJ": 8, "GO": 6, "SC": 4, "DF": 3, "MS": 2, "RS": 2, "BA": 1}


def escolha(rng, opcoes, pesos=None):
    return rng.choices(opcoes, weights=pesos, k=1)[0]


# Script de demonstração: só envia para um painel rodando na própria máquina.
HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1"}


def url_local(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme not in ("http", "https") or u.hostname not in HOSTS_LOCAIS:
        raise SystemExit(f"--url deve apontar para o painel local (localhost/127.0.0.1), recebido: {url}")
    return f"{u.scheme}://{u.netloc}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:3000")
    ap.add_argument("--total", type=int, default=700)
    ap.add_argument("--semente", type=int, default=42)
    ap.add_argument("--token", default=os.environ.get("SYNC_API_TOKEN", ""),
                    help="SYNC_API_TOKEN do painel (padrão: variável de ambiente SYNC_API_TOKEN)")
    a = ap.parse_args()
    a.url = url_local(a.url)
    rng = random.Random(a.semente)
    q = json.loads(QUESTIONARIO.read_text(encoding="utf-8"))
    perguntas = {x["key"]: x for x in q["questions"]}
    opts = lambda k: [o["value"] for o in perguntas[k]["options"]]
    estados = {o["uf"]: o["value"] for o in perguntas["estado"]["options"]}
    servicos = [x for x in q["questions"] if x["key"].startswith("servico_")]
    atrativos = [x for x in q["questions"] if x["key"].startswith("atrativo_")]
    conceitos = [o["value"] for o in servicos[0]["options"]]  # Ótimo, Regular, Ruim, Não sei, Não utilizei

    dispositivo = {c: str(uuid.uuid5(uuid.NAMESPACE_DNS, f"oto-demo-{c}")) for c, _, _ in PESQUISADORES}
    contador = {c: 1000 for c, _, _ in PESQUISADORES}  # começa em 1001: não colide com o protocolo do app
    meses = list(PESO_MES)
    hoje = datetime(2026, 11, 18, tzinfo=timezone.utc)
    pesquisas = []

    for _ in range(a.total):
        mes = escolha(rng, meses, [PESO_MES[m] for m in meses])
        ultimo = 18 if mes == 11 else 28
        inicio = datetime(2026, mes, rng.randint(1, ultimo), rng.randint(12, 20), rng.randint(0, 59), tzinfo=timezone.utc)  # 09h-17h BRT
        if inicio > hoje:
            inicio = hoje - timedelta(hours=rng.randint(1, 30))
        fim = inicio + timedelta(minutes=rng.randint(6, 14))
        cod, local, _ = escolha(rng, PESQUISADORES, [p[2] for p in PESQUISADORES])
        contador[cod] += 1

        uf = escolha(rng, list(PESO_UF), list(PESO_UF.values()))
        chegada = inicio.date() - timedelta(days=rng.randint(0, 2))
        pernoites = escolha(rng, [0, 1, 2, 3, 4, 5, 7], [5, 12, 28, 26, 14, 9, 6])
        gen = escolha(rng, ["Feminino", "Masculino", "Outros"], [54, 44, 2])
        idade = max(16, min(78, int(rng.gauss(36, 12))))
        renda = escolha(rng, opts("renda"))
        base_gasto = 180 + 60 * opts("renda").index(renda) + rng.randint(-60, 120)
        nps = escolha(rng, list(range(0, 11)), [1, 1, 1, 1, 2, 3, 4, 8, 14, 22, 43])
        r = {
            "estado": estados[uf],
            "cidade": rng.choice(CIDADES[uf]),
            "data_chegada": chegada.isoformat(),
            "data_partida": (chegada + timedelta(days=pernoites)).isoformat(),
            "pernoites": pernoites,
            "antecedencia": escolha(rng, opts("antecedencia"), [8, 22, 20, 22, 14, 6, 3, 5]),
            "conhecimento": escolha(rng, opts("conhecimento")),
            "motivos": ", ".join(rng.sample(opts("motivos"), rng.randint(1, 3))),
            "considerou_outro": "Não",
            "transporte": escolha(rng, opts("transporte"), [62, 8, 14, 4, 6, 1]),
            "com_quem": escolha(rng, opts("com_quem")),
            "pcd": escolha(rng, ["Sim", "Não"], [8, 92]),
            "hospedagem": escolha(rng, opts("hospedagem"), [30, 14, 18, 6, 2, 3, 12, 9, 4, 2]),
            "refeicoes": ", ".join(rng.sample(opts("refeicoes"), rng.randint(1, 2))),
            "costuma_visitar": escolha(rng, opts("costuma_visitar"), [58, 42]),
            "voltaria": escolha(rng, opts("voltaria"), [82, 4, 14]),
            "indicaria": escolha(rng, opts("indicaria"), [86, 3, 11]),
            "expectativa": escolha(rng, opts("expectativa")),
            "nps": nps,
            "nota_destino": min(10, max(5, nps + rng.randint(-1, 1))),
            "genero": gen,
            "idade": idade,
            "estado_civil": escolha(rng, opts("estado_civil")),
            "escolaridade": escolha(rng, opts("escolaridade")),
            "ocupacao": escolha(rng, opts("ocupacao")),
            "renda": renda,
            "gasto_diario": max(60, base_gasto),
        }
        r["aeroporto"] = escolha(rng, opts("aeroporto")) if r["transporte"] == "Aéreo" else None
        for s in servicos + atrativos:
            r[s["key"]] = escolha(rng, conceitos, [58, 22, 6, 6, 8] if s in servicos else [48, 14, 3, 5, 30])

        flags = []
        if rng.random() < 0.012:  # alguns valores absurdos para a fila de curadoria
            r["idade"] = rng.choice([150, 500, 12])
            flags.append({"regra": "idade", "chave": "idade", "titulo": "Idade fora do esperado",
                          "mensagem": f"{r['idade']} anos parece incorreto. Confirme com o entrevistado.", "status": "confirmed"})
        pesquisas.append({
            "id": str(uuid.uuid4()), "protocolo": contador[cod], "pesquisador": cod, "local": local,
            "dispositivo": dispositivo[cod], "versaoQuestionario": q["version"],
            "iniciadaEm": inicio.isoformat().replace("+00:00", "Z"), "finalizadaEm": fim.isoformat().replace("+00:00", "Z"),
            "respostas": [{"chave": k, "valor": v} for k, v in r.items() if v is not None],
            "sinalizacoes": flags, "historico": [],
        })

    aceitas = rejeitadas = 0
    for i in range(0, len(pesquisas), 25):
        lote = pesquisas[i:i + 25]
        req = urllib.request.Request(f"{a.url}/api/v1/pesquisas/lote", data=json.dumps({"pesquisas": lote}).encode(),
                                     headers={"Content-Type": "application/json; charset=utf-8",
                                              "Authorization": f"Bearer {a.token}"}, method="POST")
        with urllib.request.urlopen(req, timeout=300) as resp:
            out = json.load(resp)
        aceitas += len(out["aceitas"])
        rejeitadas += len(out["rejeitadas"])
        if out["rejeitadas"]:
            print("  rejeitadas:", list(out["rejeitadas"].values())[:2])
        print(f"  {min(i + 25, len(pesquisas))}/{len(pesquisas)}", end="\r")
    print(f"\nPesquisas aceitas: {aceitas} | rejeitadas: {rejeitadas}")


if __name__ == "__main__":
    main()
