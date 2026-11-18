#!/usr/bin/env python3
"""Gera db/seeds/S04_formulario.sql a partir do questionário do app do pesquisador.

    python3 scripts/gerar_seed_formulario.py [caminho/questionnaire.json]

Fonte padrão: ../android-app-olimpia/assets/seed/questionnaire.json.
O seed é idempotente: se o formulário já existe, não faz nada (nova versão = novo seed/migração).

Mapeamento app -> banco:
  state/single -> UNICA_ESCOLHA | multi -> MULTIPLA_ESCOLHA | city -> MUNICIPIO | cityMulti -> MUNICIPIO_MULTIPLO
  date -> DATA | integer/nights/counter -> NUMERO | currency -> MOEDA | scale -> ESCALA_0_10 | text -> TEXTO
  rating (serviços e atrativos) -> uma pergunta MATRIZ_AVALIACAO por grupo + um item_avaliacao por chave
"""
import json, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
FONTE = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent / "android-app-olimpia/assets/seed/questionnaire.json"
SAIDA = RAIZ / "db/seeds/S04_formulario.sql"

TIPO = {"state": "UNICA_ESCOLHA", "single": "UNICA_ESCOLHA", "multi": "MULTIPLA_ESCOLHA", "city": "MUNICIPIO",
        "cityMulti": "MUNICIPIO_MULTIPLO", "date": "DATA", "integer": "NUMERO", "nights": "NUMERO",
        "counter": "NUMERO", "currency": "MOEDA", "scale": "ESCALA_0_10", "text": "TEXTO"}


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")[:50] or "x"


q = json.loads(FONTE.read_text(encoding="utf-8"))
versao = int(q["version"])
secoes = {s["id"]: s for s in q["sections"]}
L = ["-- GERADO por scripts/gerar_seed_formulario.py - não edite à mão.", "SET search_path = oto, public;", "DO $seed$",
     "DECLARE f bigint; v bigint; s bigint; p bigint;", "BEGIN",
     "  IF EXISTS (SELECT 1 FROM formulario WHERE nome = 'Pesquisa de Demanda Turística') THEN RETURN; END IF;",
     "  INSERT INTO formulario (nome, descricao) VALUES ('Pesquisa de Demanda Turística',",
     f"    {lit('Importado de: ' + q['source'])}) RETURNING id INTO f;",
     f"  INSERT INTO formulario_versao (formulario_id, numero, publicada, vigente_de) VALUES (f, {versao}, true, DATE '2026-01-01') RETURNING id INTO v;"]

ordem_pergunta = {}
matriz = {}  # (secao, grupo) -> pergunta já criada
for sid in sorted(secoes):
    sec = secoes[sid]
    sub = sec.get("subtitle", "")
    sub = None if "{" in sub else sub
    L.append(f"  INSERT INTO secao (formulario_versao_id, ordem, titulo, subtitulo) VALUES (v, {sid}, {lit(sec['title'])}, {lit(sub) if sub else 'NULL'}) RETURNING id INTO s;")
    itens, ord_item = [], 0
    for x in sorted((x for x in q["questions"] if x["section"] == sid), key=lambda x: x["position"]):
        if x["type"] == "rating":
            itens.append(x)
            continue
        ordem_pergunta[sid] = ordem_pergunta.get(sid, 0) + 1
        cfg = {k: x[k] for k in ("suspectMin", "suspectMax", "min", "max", "maxLength") if k in x}
        obrig = "false" if x["type"] in ("text", "cityMulti") or "dependsOn" in x else "true"
        L.append(f"  INSERT INTO pergunta (secao_id, ordem, codigo, enunciado, ajuda, tipo, obrigatoria, config) VALUES (s, {ordem_pergunta[sid]}, {lit(x['key'])}, {lit(x['label'][:300])}, {lit(x['hint']) if x.get('hint') else 'NULL'}, '{TIPO[x['type']]}', {obrig}, {lit(json.dumps(cfg))}::jsonb) RETURNING id INTO p;")
        opts = [o["value"] for o in x.get("options", [])]
        if x["type"] == "state" and x.get("exteriorValue"):
            opts.append(x["exteriorValue"])
        usados = set()
        for i, val in enumerate(opts, 1):
            cod = slug(val)
            if cod in usados:
                cod = f"{cod}_{i}"
            usados.add(cod)
            L.append(f"  INSERT INTO opcao (pergunta_id, ordem, rotulo, valor) VALUES (p, {i}, {lit(val)}, {lit(cod)});")
        if "suspectMin" in x or "suspectMax" in x:
            par = {k: x[k] for k in ("suspectMin", "suspectMax") if k in x}
            par = {"min": par.get("suspectMin"), "max": par.get("suspectMax")}
            msg = x.get("suspectMessage", "Valor fora do esperado").replace("{value}", "").strip() or x["suspectTitle"]
            L.append(f"  INSERT INTO regra_validacao (pergunta_id, tipo, parametros, mensagem) VALUES (p, 'FAIXA_NUMERICA', {lit(json.dumps(par))}::jsonb, {lit(x.get('suspectTitle', msg))});")
    if itens:
        grupo = "SERVICO" if sec["title"].lower().startswith("avalia") and "servi" in sec["title"].lower() else "ATRATIVO"
        cod = "avaliacao_servicos" if grupo == "SERVICO" else "avaliacao_atrativos"
        ordem_pergunta[sid] = ordem_pergunta.get(sid, 0) + 1
        L.append(f"  INSERT INTO pergunta (secao_id, ordem, codigo, enunciado, tipo, obrigatoria, grupo_itens) VALUES (s, {ordem_pergunta[sid]}, '{cod}', {lit(sec['title'])}, 'MATRIZ_AVALIACAO', true, '{grupo}');")
        for i, it in enumerate(itens, 1):
            L.append(f"  INSERT INTO item_avaliacao (tipo, nome, ordem, codigo) VALUES ('{grupo}', {lit(it['label'])}, {i}, {lit(it['key'])}) ON CONFLICT DO NOTHING;")
L += ["END", "$seed$;", ""]
SAIDA.write_text("\n".join(L), encoding="utf-8", newline="\n")
print(f"{SAIDA} gerado: {sum(1 for x in q['questions'])} perguntas do app, {len(secoes)} seções")
