"""Builds the app seed (assets/seed/*.json) from the official tabulation spreadsheet.

Usage:
    python tool/build_seed.py "<path to PLANILHA TABULACAO ... .xlsx>"

* Question texts come from the header row of the "Respostas ao formulário 1" sheet.
* Answer options come from the "RESULTADOS" sheet (the blocks that end in "TOTAL:").
* `value` is kept EXACTLY as written in the spreadsheet so the tabulation formulas
  (COUNTIF) keep matching; `label` is the short UI text from the Figma prototype.
* The script fails if any option value is not present in the spreadsheet.
* Cities come from the IBGE API dump (tool/ibge_municipios.json).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx_read import read_sheet  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "seed")
RESPONSES = "Respostas ao formulário 1"
RESULTS = "RESULTADOS"
SEED_VERSION = 1

RATING = [("Ótimo", "Ótimo", "positive"), ("Regular", "Regular", "warning"), ("Ruim", "Ruim", "negative"),
          ("Não sei opinar", "Não sei", "muted"), ("Não utilizei", "Não utilizei", "muted")]
YES_NO = [("Sim", "Sim", "positive"), ("Não", "Não", "negative")]

SECTIONS = [
    dict(id=1, title="Origem do turista", subtitle="De onde o entrevistado vem.", reviewTitle="Origem"),
    dict(id=2, title="Estadia", subtitle="Período da visita a Olímpia.", reviewTitle="Estadia"),
    dict(id=3, title="Decisão da viagem", subtitle="Como e por que escolheu Olímpia.", reviewTitle="Decisão da viagem"),
    dict(id=4, title="Transporte", subtitle="Como chegou a Olímpia.", reviewTitle="Transporte"),
    dict(id=5, title="Grupo de viagem", subtitle="Com quem o entrevistado está.", reviewTitle="Grupo de viagem"),
    dict(id=6, title="Hospedagem e refeições", subtitle="Onde ficou e onde come.", reviewTitle="Hospedagem e refeições"),
    dict(id=7, title="Avaliação dos serviços", subtitle="{count} itens · toque em uma opção por item.",
         reviewTitle="Avaliação de serviços", layout="ratings"),
    dict(id=8, title="Avaliação dos atrativos", subtitle="{count} atrativos · {answered} avaliados",
         reviewTitle="Avaliação de atrativos", layout="ratings", searchable=True,
         searchPlaceholder="Buscar atrativo…", bulkValue="Não utilizei"),
    dict(id=9, title="Satisfação", subtitle="Experiência geral com o destino.", reviewTitle="Satisfação"),
    dict(id=10, title="Perfil do entrevistado", subtitle="Últimas perguntas.", reviewTitle="Perfil"),
]

# key, section, xlsx column, extra fields. `opts`: list of (xlsx value, ui label[, tone]).
# `heading`: start text of the RESULTADOS block used to validate the options.
Q = [
    # 1 · Origem
    dict(key="estado", section=1, col=3, type="state", label="Em qual Estado reside?", heading="Em qual Estado reside?",
         exteriorValue="Residente Exterior", exteriorLabel="Reside no exterior", opts="__states__"),
    dict(key="cidade", section=1, col=4, type="city", label="Em qual cidade reside?", placeholder="Digite a cidade…",
         dependsOn=dict(key="estado", notValues=["Residente Exterior"]),
         footnote="Lista de cidades do IBGE embutida no app: funciona sem internet."),
    # 2 · Estadia
    dict(key="data_chegada", section=2, col=5, type="date", label="Data de chegada", labelStyle="caps", card="estadia"),
    dict(key="data_partida", section=2, col=6, type="date", label="Data de partida", labelStyle="caps", card="estadia"),
    dict(key="pernoites", section=2, col=7, type="nights", label="Pernoites (calculado automaticamente)",
         labelStyle="row", card="estadia", dayUseLabel="Day use (não pernoitou)", suspectMax=30,
         suspectTitle="Estadia fora do esperado", suspectMessage="{value} pernoites parece incorreto. Confirme com o entrevistado.",
         reviewTag="Pernoites: {value}"),
    dict(key="antecedencia", section=2, col=9, type="single", display="radio",
         label="Com quanto tempo de antecedência decidiu vir para Olímpia?",
         heading="Com quanto tempo de antecedência", opts=[
             ("No dia da viagem (Decisão de última hora/impulso)", "No dia da viagem"), ("De 1 a 7 dias", None),
             ("De 8 a 15 dias", None), ("De 16 a 30 dias", None), ("De 1 a 3 meses", None), ("De 4 a 6 meses", None),
             ("Mais de 6 meses", None), ("Não sei / Não me recordo", None)]),
    # 3 · Decisão da viagem
    dict(key="conhecimento", section=3, col=8, type="single", display="chips", label="Como tomou conhecimento sobre Olímpia?",
         heading="Como você tomou conhecimento sobre a cidade de Olímpia?", opts=[
             ("Agência de Viagem", None), ("Indicação de Amigos/Parentes", "Indicação de amigos/parentes"),
             ("Influenciadores digitais", None), ("Mora próximo", None),
             ("Redes socias (Facebook, Instagram e etc.)", "Redes sociais"),
             ("Sites de busca (Google e etc.)", "Sites de busca"),
             ("Site de Reserva (Booking, Hoteis.com, Tripadvisor e etc.)", "Site de reserva"), ("TV/rádio", None),
             ("Não me recordo, já venho há muito tempo", "Não me recordo"), ("Outro:", "Outro")]),
    dict(key="motivos", section=3, col=10, type="multi", display="chips", label="Principais motivos da viagem",
         heading="Quais atrativos o trouxe para Olímpia?", opts=[
             ("Parques (Aquático/Temáticos)", "Parques aquáticos/temáticos"), ("Resort ou Hotelaria", "Resort ou hotelaria"),
             ("Visita à Familiares/Amigos", "Visita a familiares/amigos"), ("Cultura", None), ("Gastronomia", None),
             ("Evento/Festival", None), ("Negócio/trabalho", None), ("Descanso", None), ("Clima", None), ("Outro:", "Outro")]),
    dict(key="considerou_outro", section=3, col=11, type="single", display="chips", card="destinos",
         label="Considerou outro destino antes de Olímpia?",
         heading="Você considerou viajar para outro destino", opts=[("Sim", None), ("Não", None)]),
    dict(key="destinos", section=3, col=12, type="cityMulti", label="Quais destinos?", labelStyle="caps", card="destinos",
         placeholder="Digite…", dependsOn=dict(key="considerou_outro", values=["Sim"])),
    # 4 · Transporte
    dict(key="transporte", section=4, col=13, type="single", display="radio", label="Qual meio de transporte utilizado?",
         heading="Qual meio de transporte utilizado?", opts=[
             ("Veículo próprio", None), ("Ônibus de linha", None), ("Ônibus/Van de excursão", None), ("Aéreo", None),
             ("Veículo alugado", None), ("Outro:", "Outro")]),
    dict(key="aeroporto", section=4, col=14, type="single", display="chips", label="Como chegou do aeroporto a Olímpia?",
         heading='Caso respondeu "Aéreo"', dependsOn=dict(key="transporte", values=["Aéreo"]), conditionalNote=True, opts=[
             ("Táxi", None), ("Aplicativo", None), ("Ônibus de linha", None),
             ("Transfer oferecido pelo Meio de Hospedagem", "Transfer da hospedagem"), ("Veículo alugado", None),
             ("Outro", None)]),
    # 5 · Grupo
    dict(key="com_quem", section=5, col=15, type="multi", display="chips", label="Com quem está viajando?",
         hint="", heading="Com quem está viajando?", opts=[
             ("Sozinho(a)", None), ("Família", None), ("Amigos", None), ("Noivo(a)/Namorado(a)", None),
             ("Colegas de trabalho", None), ("Excursão", None), ("Outro:", "Outro")]),
    *[dict(key=f"acomp_{k}", section=5, col=c, type="counter", label=l, labelStyle="row", card="acompanhantes",
           cardTitle="Nº de acompanhantes por faixa etária", suspectMax=15,
           suspectTitle="Quantidade fora do esperado",
           suspectMessage="{value} acompanhantes de " + l + " parece incorreto. Confirme com o entrevistado.",
           reviewTag="Acompanhantes: {value}")
      for k, c, l in [("0_12", 16, "0 a 12 anos"), ("13_17", 17, "13 a 17 anos"), ("18_29", 18, "18 a 29 anos"),
                      ("30_44", 19, "30 a 44 anos"), ("45_64", 20, "45 a 64 anos"), ("65_mais", 21, "Acima de 65 anos")]],
    dict(key="pcd", section=5, col=22, type="single", display="chips", card="pcd",
         label="No grupo há pessoas com alguma deficiência?",
         heading="No seu grupo há pessoas com alguma deficiência", opts=[("Sim", None), ("Não", None)]),
    dict(key="pcd_quantidade", section=5, col=23, type="counter", label="Quantas pessoas", labelStyle="row", card="pcd",
         min=1, dependsOn=dict(key="pcd", values=["Sim"])),
    dict(key="pcd_tipo", section=5, col=24, type="multi", display="chips", label="Tipo de deficiência", labelStyle="caps",
         card="pcd", heading="Qual o tipo de deficiência?", dependsOn=dict(key="pcd", values=["Sim"]), opts=[
             ("Física", None), ("Visual", None), ("Auditiva", None), ("Intelectual", None), ("Múltipla", None),
             ("Outros", None)]),
    # 6 · Hospedagem e refeições
    dict(key="hospedagem", section=6, col=25, type="single", display="radio", label="Qual meio de hospedagem utilizado?",
         heading="Qual meio de hospedagem utilizado?", opts=[
             ("Hotel", None), ("Pousada", None), ("Resort", None), ("Hotel fazenda", None), ("Hostel", None), ("Flat", None),
             ("Imóvel alugado / Casa de Temporada / Airbnb", "Imóvel alugado / Airbnb"),
             ("Casa de Parentes e Amigos", "Casa de parentes e amigos"),
             ("Day use/não me hospedei", "Day use / não se hospedou"),
             ("Outros – Imóvel próprio (veraneio), motorhome e camping", "Outros")]),
    dict(key="refeicoes", section=6, col=26, type="multi", display="chips", label="Onde faz / fez as refeições?",
         heading="Onde faz / fez as refeições?", opts=[
             ("Dentro dos parques aquáticos", "Dentro dos parques"), ("No local onde está hospedado", "No local de hospedagem"),
             ("Estabelecimentos na cidade", None), ("Trouxe de casa", None), ("Não Utilizou", "Não utilizou")]),
    # 9 · Satisfação
    dict(key="costuma_visitar", section=9, col=61, type="single", display="segmented", labelStyle="row", card="satisfacao",
         label="Costuma visitar Olímpia?", heading="Costuma visitar Olímpia?", opts=[
             ("Já visitei / Já conheço", "Sim", "positive"), ("1º vez que visita", "Não", "negative")]),
    dict(key="voltaria", section=9, col=62, type="single", display="segmented", labelStyle="row", card="satisfacao",
         label="Voltaria à cidade?", heading="Voltaria a cidade", opts=[*YES_NO, ("Talvez", "Talvez", "warning")]),
    dict(key="indicaria", section=9, col=63, type="single", display="segmented", labelStyle="row", card="satisfacao",
         label="Indicaria a cidade?", heading="Você indicaria a cidade", opts=[*YES_NO, ("Talvez", "Talvez", "warning")]),
    dict(key="expectativa", section=9, col=64, type="single", display="segmented", labelStyle="row", card="satisfacao",
         label="Expectativa atendida?", heading="Sua expectativa de viagem foi atendida?",
         opts=[*YES_NO, ("Em parte", "Em parte", "warning")]),
    dict(key="nps", section=9, col=65, type="scale", variant="nps", min=0, max=10,
         label="De 0 a 10, qual a probabilidade de recomendar Olímpia?", minLabel="Nada provável", maxLabel="Muito provável"),
    dict(key="nota_destino", section=9, col=66, type="scale", variant="plain", min=0, max=10,
         label="De 0 a 10, que nota daria para Olímpia?"),
    dict(key="o_que_falta", section=9, col=67, type="text", maxLength=500, label="O que falta para Olímpia ser melhor?",
         placeholder="Anote a resposta do entrevistado…"),
    # 10 · Perfil
    dict(key="genero", section=10, col=68, type="single", display="chips", label="Com qual gênero se identifica?",
         heading="Com qual gênero se identifica?", opts=[
             ("Feminino", None), ("Masculino", None), ("Outros", "Outro"), ("Prefiro não me identificar", "Prefere não dizer")]),
    dict(key="idade", section=10, col=69, type="integer", label="Qual a sua idade?", suffix="anos", placeholder="Idade",
         suspectMin=16, suspectMax=100, suspectTitle="Idade fora do esperado",
         suspectMessage="{value} anos parece incorreto. Confirme com o entrevistado.", reviewTag="Idade: {value}"),
    dict(key="estado_civil", section=10, col=70, type="single", display="chips", label="Estado civil",
         heading="Estado Civil", opts=[
             ("Solteiro (a)", "Solteiro(a)"), ("Casado (a)", "Casado(a)"), ("União Estável", "União estável"),
             ("Separado (a)", "Separado(a)"), ("Divorciado (a)", "Divorciado(a)"), ("Viúvo (a)", "Viúvo(a)"),
             ("Outro:", "Outro")]),
    dict(key="escolaridade", section=10, col=71, type="single", display="chips", label="Grau de escolaridade",
         heading="Grau de escolaridade", opts=[
             ("Sem Ensino Formal", "Sem ensino formal"), ("Fundamental", None), ("Médio", None), ("Superior", None),
             ("Pós-graduação", None)]),
    dict(key="ocupacao", section=10, col=72, type="multi", display="chips", label="Ocupação profissional",
         heading="Ocupação profissional", opts=[
             ("Assalariado registrado", None), ("Autônomo", None), ("Empresário", None), ("Funcionário público", None),
             ("Aposentado", None), ("Estudante", None), ("Estagiário", None), ("Dona de casa", None),
             ("Desempregado", None), ("Outro", None)]),
    dict(key="renda", section=10, col=73, type="single", display="radio", label="Qual a sua renda familiar?",
         heading="Qual a sua renda familiar", opts=[
             ("Até 2 Salários Mínimos (até R$ 3.242,00)", "Até 2 salários mínimos (até R$ 3.242)"),
             ("De 2 a 4 Salários Mínimos (R$ 3.242,01 a R$ 6.484,00)", "De 2 a 4 SM (R$ 3.242 a R$ 6.484)"),
             ("De 4 a 10 Salários Mínimos (R$ 6.484,01 a R$ 16.210,00)", "De 4 a 10 SM (R$ 6.484 a R$ 16.210)"),
             ("De 10 a 20 Salários Mínimos (R$ 16.210,01 a R$ 32.420,00)", "De 10 a 20 SM (R$ 16.210 a R$ 32.420)"),
             ("Mais de 20 Salários Mínimos (Acima de R$ 32.420,00)", "Mais de 20 SM (acima de R$ 32.420)"),
             ("Prefiro não responder / Não sei", None)]),
    dict(key="pessoas_renda", section=10, col=74, type="counter", label="Pessoas", labelStyle="row", min=1,
         card="pessoas_renda", cardTitle="Quantas pessoas estão inclusas nessa renda, incluindo você?", suspectMax=15,
         suspectTitle="Quantidade fora do esperado",
         suspectMessage="{value} pessoas na renda parece incorreto. Confirme com o entrevistado.",
         reviewTag="Pessoas: {value}"),
    dict(key="gasto_diario", section=10, col=75, type="currency", label="Gasto médio diário em Olímpia",
         hint="Não incluir transporte entre cidades", placeholder="0,00", suspectMax=5000,
         suspectTitle="Gasto fora do esperado",
         suspectMessage="R$ {value} por dia parece incorreto. Confirme com o entrevistado.", reviewTag="Gasto: R$ {value}"),
]

# Figma uses sentence case for a few rating labels.
RATING_LABELS = {"Segurança da Cidade": "Segurança da cidade",
                 "Sinalização Turística e de Ruas": "Sinalização turística e de ruas",
                 "Estrutura Viária Urbana": "Estrutura viária urbana",
                 "Rodovias de Acesso à Cidade": "Rodovias de acesso à cidade",
                 "Limpeza da Cidade": "Limpeza da cidade", "Compras em Geral": "Compras em geral",
                 "Mobilidade/Transporte Urbano": "Mobilidade/transporte urbano"}
# Attractions shown first in the prototype (most visited); the rest keep spreadsheet order.
ATTRACTIONS_FIRST = ["P. Aquático Thermas dos Laranjais", "P. Aquático Hot Beach", "Vale dos Dinossauros",
                     "Museu do Folclore", "Praça da Matriz / Coreto"]


def results_block(rows, heading, exact=False):
    """Returns the option texts under a RESULTADOS heading (until the 'TOTAL' row)."""
    for i, row in enumerate(rows):
        text = row.get(2, "")
        if (text == heading) if exact else text.startswith(heading):
            out = []
            for nxt in rows[i + 1:]:
                v = nxt.get(2, "")
                if v.upper().startswith("TOTAL"):
                    return out
                if not v or nxt.get(3) == "Qtde":
                    continue
                out.append(v)
            return out
    raise KeyError(f"RESULTADOS heading not found: {heading}")


def split_multi(values):
    seen, out = set(), []
    for v in values:
        for part in v.split(", "):
            part = part.strip()
            if part.lower() not in seen:
                seen.add(part.lower())
                out.append(part)
    return out


def build_options(spec, rows, report):
    raw = spec.pop("opts")
    heading = spec.pop("heading", None)
    available = results_block(rows, heading) if heading else []
    if spec["type"] == "multi":
        available = split_multi(available)
    lowered = {a.lower() for a in available}
    options = []
    for item in raw:
        value, label = item[0], item[1] or item[0]
        tone = item[2] if len(item) > 2 else None
        if heading and value.lower() not in lowered:
            raise ValueError(f"[{spec['key']}] option not found in spreadsheet: {value!r} (have {available})")
        opt = dict(value=value, label=label)
        if tone:
            opt["tone"] = tone
        options.append(opt)
    unused = [a for a in available if a.lower() not in {o["value"].lower() for o in options}]
    if unused:
        report.append(f"  {spec['key']}: not offered in the app (prototype/ambiguous): {unused}")
    return options


def main(xlsx):
    header = read_sheet(xlsx, RESPONSES)[0]
    rows = read_sheet(xlsx, RESULTS)
    report = []

    states = [s for s in results_block(rows, "Em qual Estado reside?") if s != "Residente Exterior"]
    state_opts = []
    for s in states:
        uf = s[s.rfind("(") + 1:s.rfind(")")]
        name = s[:s.find("(")].strip()
        state_opts.append(dict(value=s, label=f"{name} ({uf})", uf=uf))

    questions = []
    for spec in Q:
        spec = dict(spec)
        col = spec.pop("col")
        spec["xlsxColumn"] = col
        spec["sourceText"] = header[col]
        if spec.get("opts") == "__states__":
            spec.pop("opts"), spec.pop("heading")
            spec["options"] = state_opts
        elif "opts" in spec:
            spec["options"] = build_options(spec, rows, report)
        questions.append(spec)

    rating_values = results_block(rows, "Hospedagem", exact=True)
    assert [r[0] for r in RATING] == rating_values, rating_values
    rating_opts = [dict(value=v, label=l, tone=t) for v, l, t in RATING]
    services, attractions = [], []
    for col in sorted(header):
        text = header[col]
        if "[" not in text:
            continue
        item = text[text.find("[") + 1:text.rfind("]")].strip()
        target = services if text.startswith("Avalie os serviços") else attractions
        target.append((col, item, text))
    attractions.sort(key=lambda a: (ATTRACTIONS_FIRST.index(a[1]) if a[1] in ATTRACTIONS_FIRST else 99, a[0]))
    for section, items, prefix in ((7, services, "servico"), (8, attractions, "atrativo")):
        for col, item, text in items:
            questions.append(dict(key=f"{prefix}_{col}", section=section, type="rating", label=RATING_LABELS.get(item, item),
                                  xlsxColumn=col, sourceText=text, options=rating_opts))

    order = {s["id"]: 0 for s in SECTIONS}
    for q in questions:
        order[q["section"]] += 1
        q["position"] = order[q["section"]]

    ibge = json.load(open(os.path.join(ROOT, "tool", "ibge_municipios.json"), encoding="utf-8"))
    cities = {}
    for m in ibge:
        cities.setdefault(m["UF-sigla"], []).append(m["municipio-nome"])
    for uf in cities:
        cities[uf].sort()

    os.makedirs(OUT, exist_ok=True)
    seed = dict(version=SEED_VERSION, source=os.path.basename(xlsx), sections=SECTIONS, questions=questions)
    with open(os.path.join(OUT, "questionnaire.json"), "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "cities.json"), "w", encoding="utf-8") as f:
        json.dump(dict(version=SEED_VERSION, source="IBGE localidades/municipios", cities=cities), f,
                  ensure_ascii=False, separators=(",", ":"))
    print(f"questions={len(questions)} sections={len(SECTIONS)} cities={sum(len(v) for v in cities.values())}")
    print("Spreadsheet options not offered:")
    print("\n".join(report) or "  none")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1])
