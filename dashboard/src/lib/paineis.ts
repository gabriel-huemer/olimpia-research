// Abas de Análises calculadas direto do PostgreSQL. Só respostas válidas (RF12/RF14).
import { getDbPool } from "@/lib/db";
import { calcularPanorama, FAIXAS_IDADE, montarFiltro, VALIDA } from "@/lib/panorama";
import type {
  Aba,
  AnalyticsFilters,
  AtracoesDados,
  Fatia,
  ImpactoDados,
  InfraestruturaDados,
  NotaItem,
  OpcoesFiltro,
  Paineis,
  PerfilDados,
} from "@/lib/paineis-types";

/** Com menos respostas que isso, uma cidade não é mostrada em público (RN10/RF21). */
export const MINIMO_POR_CIDADE = 5;

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));

type Recorte = ReturnType<typeof montarFiltro>;

/** Junta as respostas válidas de uma pergunta ao recorte. `codigo` vem sempre do código, nunca do usuário. */
const respostasDe = (r: Recorte, codigo: string, joins = "") =>
  `FROM oto.pesquisa p
     JOIN oto.resposta r ON r.pesquisa_id = p.id AND ${VALIDA}
     JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = '${codigo}'
     JOIN oto.resposta_valor rv ON rv.resposta_id = r.id ${joins}
    WHERE ${r.where}`;

/** Quantas pesquisas marcaram cada opção, sobre quantas responderam a pergunta. */
async function distribuicao(r: Recorte, codigo: string): Promise<Fatia[]> {
  const { rows } = await getDbPool().query(
    `WITH x AS (SELECT p.id, coalesce(o.rotulo, 'Outro') AS rotulo, coalesce(o.ordem, 999) AS ordem
                ${respostasDe(r, codigo, "LEFT JOIN oto.opcao o ON o.id = rv.opcao_id")})
     SELECT rotulo, min(ordem) AS ordem, count(DISTINCT id)::int AS n, (SELECT count(DISTINCT id)::int FROM x) AS total
       FROM x GROUP BY rotulo ORDER BY n DESC, ordem`,
    r.params
  );
  return rows.map((l) => ({ rotulo: l.rotulo.replace(/:$/, ""), n: l.n, percentual: pct(l.n, l.total) }));
}

/** Mesma distribuição, na ordem em que as opções aparecem no formulário. */
async function distribuicaoOrdenada(r: Recorte, codigo: string): Promise<Fatia[]> {
  const fatias = await distribuicao(r, codigo);
  const { rows } = await getDbPool().query(
    "SELECT o.rotulo FROM oto.opcao o JOIN oto.pergunta pg ON pg.id = o.pergunta_id WHERE pg.codigo = $1 ORDER BY pg.id DESC, o.ordem",
    [codigo]
  );
  const ordem = rows.map((l) => l.rotulo.replace(/:$/, ""));
  const posicao = (f: Fatia) => (ordem.includes(f.rotulo) ? ordem.indexOf(f.rotulo) : ordem.length);
  return [...fatias].sort((a, b) => posicao(a) - posicao(b));
}

/** Nota de 1 a 5: Ótimo = 5, Regular = 3, Ruim = 1. "Não sei" e "Não utilizei" não contam. */
async function notas(r: Recorte, tipo: "SERVICO" | "ATRATIVO"): Promise<NotaItem[]> {
  const { rows } = await getDbPool().query(
    `SELECT i.nome, count(*)::int AS n,
            avg(CASE a.conceito WHEN 'OTIMO' THEN 5 WHEN 'REGULAR' THEN 3 ELSE 1 END)::float8 AS nota
       FROM oto.pesquisa p
       JOIN oto.resposta r ON r.pesquisa_id = p.id AND ${VALIDA}
       JOIN oto.avaliacao_item a ON a.resposta_id = r.id AND a.conceito IN ('OTIMO', 'REGULAR', 'RUIM')
       JOIN oto.item_avaliacao i ON i.id = a.item_avaliacao_id AND i.tipo = '${tipo}'
      WHERE ${r.where} GROUP BY i.id ORDER BY nota DESC, n DESC, i.nome`,
    r.params
  );
  return rows.map((l) => ({ nome: l.nome, nota: Math.round(l.nota * 10) / 10, avaliacoes: l.n }));
}

async function infraestrutura(r: Recorte, comTexto: boolean): Promise<InfraestruturaDados> {
  const [servicos, expectativa, pcd, tiposPcd, textos] = await Promise.all([
    notas(r, "SERVICO"),
    distribuicaoOrdenada(r, "expectativa"),
    distribuicao(r, "pcd"),
    distribuicao(r, "pcd_tipo"),
    comTexto
      ? getDbPool().query(
          `SELECT rv.valor_texto AS t ${respostasDe(r, "o_que_falta")} AND btrim(rv.valor_texto) <> ''
            ORDER BY p.iniciada_em DESC LIMIT 20`,
          r.params
        )
      : null,
  ]);
  return {
    servicos,
    expectativa,
    gruposPcd: pcd.length ? pcd.find((f) => f.rotulo === "Sim")?.percentual ?? 0 : null,
    tiposPcd,
    oQueFalta: textos ? textos.rows.map((l) => l.t) : null,
  };
}

async function impacto(r: Recorte): Promise<ImpactoDados> {
  const db = getDbPool();
  const [gasto, renda, porRenda, antecedencia, hospedagem, refeicoes] = await Promise.all([
    db.query(`SELECT avg(rv.valor_numero)::float8 AS media, count(rv.valor_numero)::int AS n ${respostasDe(r, "gasto_diario")}`, r.params),
    distribuicaoOrdenada(r, "renda"),
    db.query(
      `SELECT o.rotulo AS faixa, min(o.ordem) AS ordem, avg(g.valor)::float8 AS valor, count(*)::int AS n
       ${respostasDe(
         r,
         "renda",
         `JOIN oto.opcao o ON o.id = rv.opcao_id
          JOIN LATERAL (SELECT v2.valor_numero AS valor FROM oto.resposta r2
                          JOIN oto.pergunta q2 ON q2.id = r2.pergunta_id AND q2.codigo = 'gasto_diario'
                          JOIN oto.resposta_valor v2 ON v2.resposta_id = r2.id
                         WHERE r2.pesquisa_id = p.id AND ${VALIDA.replaceAll("r.", "r2.")}
                           AND v2.valor_numero IS NOT NULL) g ON true`
       )} GROUP BY o.rotulo ORDER BY 2`,
      r.params
    ),
    distribuicaoOrdenada(r, "antecedencia"),
    distribuicao(r, "hospedagem"),
    distribuicao(r, "refeicoes"),
  ]);
  return {
    gastoDiarioMedio: numero(gasto.rows[0].media),
    respostasGasto: gasto.rows[0].n,
    renda,
    gastoPorRenda: porRenda.rows.map((l) => ({ faixa: l.faixa, valor: l.valor, n: l.n })),
    antecedencia,
    hospedagem,
    refeicoes,
  };
}

async function perfil(r: Recorte): Promise<PerfilDados> {
  const db = getDbPool();
  const faixas = Object.entries(FAIXAS_IDADE);
  const [idades, cidades, escolaridade, estadoCivil, conhecimento, motivos, destinos] = await Promise.all([
    db.query(
      `SELECT ${faixas
        .map(([, [min, max]], i) => `count(*) FILTER (WHERE rv.valor_numero BETWEEN ${min} AND ${max})::int AS f${i}`)
        .join(", ")} ${respostasDe(r, "idade")}`,
      r.params
    ),
    db.query(
      `SELECT m.nome || ', ' || m.uf_sigla AS cidade, count(DISTINCT p.id)::int AS n,
              sum(count(DISTINCT p.id)) OVER ()::int AS total, avg(g.valor)::float8 AS gasto
       ${respostasDe(
         r,
         "cidade",
         `JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
          LEFT JOIN LATERAL (SELECT v2.valor_numero AS valor FROM oto.resposta r2
                               JOIN oto.pergunta q2 ON q2.id = r2.pergunta_id AND q2.codigo = 'gasto_diario'
                               JOIN oto.resposta_valor v2 ON v2.resposta_id = r2.id
                              WHERE r2.pesquisa_id = p.id AND ${VALIDA.replaceAll("r.", "r2.")}) g ON true`
       )} GROUP BY m.codigo_ibge ORDER BY n DESC, cidade`,
      r.params
    ),
    distribuicaoOrdenada(r, "escolaridade"),
    distribuicao(r, "estado_civil"),
    distribuicao(r, "conhecimento"),
    distribuicao(r, "motivos"),
    db.query(
      `SELECT m.nome || ', ' || m.uf_sigla AS rotulo, count(DISTINCT p.id)::int AS n
       ${respostasDe(r, "destinos", "JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge")}
       GROUP BY m.codigo_ibge ORDER BY n DESC, rotulo LIMIT 10`,
      r.params
    ),
  ]);

  const contagens = faixas.map(([rotulo], i) => ({ rotulo, n: idades.rows[0][`f${i}`] as number }));
  const totalIdades = contagens.reduce((s, f) => s + f.n, 0);
  const total = cidades.rows[0]?.total ?? 0;
  const visiveis = cidades.rows.filter((l) => l.n >= MINIMO_POR_CIDADE).slice(0, 10);
  const resto = total - visiveis.reduce((s, l) => s + l.n, 0);
  return {
    idades: totalIdades ? contagens.map((f) => ({ ...f, percentual: pct(f.n, totalIdades) })) : [],
    cidades: [
      ...visiveis.map((l) => ({ cidade: l.cidade, respostas: l.n, percentual: pct(l.n, total), gastoMedio: numero(l.gasto) })),
      ...(resto > 0
        ? [{ cidade: "Outras cidades", respostas: resto, percentual: pct(resto, total), gastoMedio: null }]
        : []),
    ],
    escolaridade,
    estadoCivil,
    conhecimento,
    motivos,
    concorrencia: destinos.rows.map((l) => ({ rotulo: l.rotulo, n: l.n, percentual: pct(l.n, destinos.rows[0].n) })),
  };
}

async function atracoes(r: Recorte): Promise<AtracoesDados> {
  const [atrativos, transporte, aeroporto] = await Promise.all([
    notas(r, "ATRATIVO"),
    distribuicao(r, "transporte"),
    distribuicao(r, "aeroporto"),
  ]);
  return { atrativos, transporte, aeroporto };
}

export async function calcularPainel<A extends Aba>(aba: A, filtros: AnalyticsFilters, comTexto: boolean): Promise<Paineis[A]> {
  const r = montarFiltro(filtros);
  const calculo: { [K in Aba]: () => Promise<Paineis[K]> } = {
    panorama: () => calcularPanorama(filtros),
    infraestrutura: () => infraestrutura(r, comTexto),
    impacto: () => impacto(r),
    perfil: () => perfil(r),
    atracoes: () => atracoes(r),
  };
  return calculo[aba]();
}

/** Opções reais dos filtros. Cidades com poucas respostas ficam de fora (RN10). */
export async function opcoesDeFiltro(): Promise<OpcoesFiltro> {
  const db = getDbPool();
  const [anos, generos, cidades, locais] = await Promise.all([
    db.query(
      `SELECT DISTINCT extract(year FROM iniciada_em AT TIME ZONE 'America/Sao_Paulo')::int AS ano
         FROM oto.pesquisa ORDER BY 1 DESC LIMIT 10`
    ),
    db.query(
      `SELECT o.rotulo, min(o.ordem) AS ordem FROM oto.opcao o
         JOIN oto.pergunta pg ON pg.id = o.pergunta_id AND pg.codigo = 'genero' GROUP BY 1 ORDER BY 2`
    ),
    db.query(
      `SELECT m.nome || ', ' || m.uf_sigla AS cidade FROM oto.resposta r
         JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = 'cidade'
         JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
         JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
        WHERE ${VALIDA} GROUP BY m.codigo_ibge HAVING count(DISTINCT r.pesquisa_id) >= ${MINIMO_POR_CIDADE}
        ORDER BY count(*) DESC, 1 LIMIT 50`
    ),
    db.query("SELECT nome FROM oto.local_coleta WHERE ativo ORDER BY nome"),
  ]);
  const anoAtual = new Date().getFullYear();
  const lista = [...new Set([anoAtual, ...anos.rows.map((l) => l.ano as number)])].sort((a, b) => b - a);
  return {
    periodos: ["Mês atual", "Últimos 30 dias", ...lista.map((a) => `Ano ${a}`)],
    generos: generos.rows.map((l) => l.rotulo),
    cidades: cidades.rows.map((l) => l.cidade),
    locais: locais.rows.map((l) => l.nome),
  };
}
