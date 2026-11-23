// Tudo o que as três versões do relatório usam, em um só retrato do banco. Público: nunca traz texto livre.
import { getDbPool } from "@/lib/db";
import { calcularPainel, distribuicao, pct, type Recorte } from "@/lib/paineis";
import { ABAS, paineisVazios, type AnalyticsFilters, type Paineis } from "@/lib/paineis-types";
import { montarFiltro, VALIDA } from "@/lib/panorama";
import { hojeLocal, resolverPeriodo, type Intervalo } from "@/lib/periodo";
import { montarSerie } from "@/lib/relatorio/serie";
import type { Conceitos, DadosRelatorio, Medidas } from "@/lib/relatorio/tipos";

const DIA_LOCAL = "(p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date";
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function medir(r: Recorte, intervalos: Intervalo[]): Promise<Medidas[]> {
  if (!intervalos.length) return [];
  const i = r.params.length;
  const { rows } = await getDbPool().query(
    `WITH b AS (SELECT * FROM unnest($${i + 1}::date[], $${i + 2}::date[]) WITH ORDINALITY AS x(ini, fim, ord)),
          base AS (SELECT p.id, ${DIA_LOCAL} AS d FROM oto.pesquisa p WHERE ${r.where}),
          v AS (SELECT base.id, base.d, pg.codigo, rv.valor_numero AS num, o.rotulo
                  FROM base
                  JOIN oto.resposta r ON r.pesquisa_id = base.id AND ${VALIDA}
                  JOIN oto.pergunta pg ON pg.id = r.pergunta_id
                       AND pg.codigo IN ('nps', 'pernoites', 'gasto_diario', 'voltaria', 'costuma_visitar')
                  JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
                  LEFT JOIN oto.opcao o ON o.id = rv.opcao_id)
     SELECT (SELECT count(*)::int FROM base WHERE base.d >= b.ini AND base.d < b.fim) AS n,
            count(*) FILTER (WHERE codigo = 'nps' AND num >= 9)::int AS prom,
            count(*) FILTER (WHERE codigo = 'nps' AND num BETWEEN 7 AND 8.99)::int AS neut,
            count(*) FILTER (WHERE codigo = 'nps' AND num < 7)::int AS detr,
            avg(num) FILTER (WHERE codigo = 'pernoites' AND num > 0)::float8 AS permanencia,
            avg(num) FILTER (WHERE codigo = 'gasto_diario')::float8 AS gasto,
            count(DISTINCT id) FILTER (WHERE codigo = 'voltaria' AND rotulo = 'Sim')::int AS volta,
            count(DISTINCT id) FILTER (WHERE codigo = 'voltaria' AND rotulo IS NOT NULL)::int AS volta_total,
            count(DISTINCT id) FILTER (WHERE codigo = 'costuma_visitar' AND rotulo ILIKE '%visitei%')::int AS recorrente,
            count(DISTINCT id) FILTER (WHERE codigo = 'costuma_visitar' AND rotulo ILIKE '1%vez%')::int AS primeira
       FROM b LEFT JOIN v ON v.d >= b.ini AND v.d < b.fim
      GROUP BY b.ord, b.ini, b.fim ORDER BY b.ord`,
    [...r.params, intervalos.map((x) => x.inicio), intervalos.map((x) => x.fim)]
  );
  return rows.map((l) => {
    const base = l.prom + l.neut + l.detr;
    const visitas = l.recorrente + l.primeira;
    const promotores = base ? pct(l.prom, base) : null;
    const detratores = base ? pct(l.detr, base) : null;
    const temNps = promotores !== null && detratores !== null;
    return {
      n: l.n,
      nps: temNps ? promotores - detratores : null,
      promotores,
      neutros: temNps ? 100 - promotores - detratores : null,
      detratores,
      permanencia: num(l.permanencia),
      gasto: num(l.gasto),
      retorno: l.volta_total ? pct(l.volta, l.volta_total) : null,
      primeiraVez: visitas ? pct(l.primeira, visitas) : null,
    };
  });
}

async function conceitos(r: Recorte): Promise<Conceitos[]> {
  const { rows } = await getDbPool().query(
    `SELECT i.nome, count(*)::int AS n,
            count(*) FILTER (WHERE a.conceito = 'OTIMO')::int AS otimo, count(*) FILTER (WHERE a.conceito = 'RUIM')::int AS ruim
       FROM oto.pesquisa p
       JOIN oto.resposta r ON r.pesquisa_id = p.id AND ${VALIDA}
       JOIN oto.avaliacao_item a ON a.resposta_id = r.id AND a.conceito IN ('OTIMO', 'REGULAR', 'RUIM')
       JOIN oto.item_avaliacao i ON i.id = a.item_avaliacao_id AND i.tipo = 'SERVICO'
      WHERE ${r.where} GROUP BY i.id ORDER BY i.nome`,
    r.params
  );
  return rows.map((l) => {
    const otimo = pct(l.otimo, l.n);
    const ruim = Math.min(pct(l.ruim, l.n), 100 - otimo);
    return { nome: l.nome, n: l.n, otimo, ruim, regular: 100 - otimo - ruim };
  });
}

export async function dadosDoRelatorio(filtros: Required<AnalyticsFilters>): Promise<DadosRelatorio> {
  const db = getDbPool();
  const hoje = hojeLocal();
  const periodo = resolverPeriodo(filtros.periodo, hoje);
  const r = montarFiltro(filtros);

  // Uma aba por vez: cada uma já faz várias consultas e o pool é pequeno.
  const paineis: Paineis = { ...paineisVazios };
  const guardar = async <A extends keyof Paineis>(aba: A) => {
    paineis[aba] = await calcularPainel(aba, filtros, false);
  };
  for (const aba of ABAS) await guardar(aba);

  const resumo = (
    await db.query(
      `SELECT count(*)::int AS total, min(${DIA_LOCAL})::text AS primeira, max(${DIA_LOCAL})::text AS ultima,
              count(*) FILTER (WHERE p.status_curadoria = 'EM_REVISAO')::int AS revisao,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM oto.resposta x WHERE x.pesquisa_id = p.id AND x.situacao = 'EXCLUIDA'))::int AS excluida,
              count(DISTINCT p.pesquisador_id)::int AS pesquisadores
         FROM oto.pesquisa p WHERE ${r.where}`,
      r.params
    )
  ).rows[0];
  const { granularidade, pontos } = montarSerie(periodo, resumo.primeira, resumo.ultima, hoje);
  const [total, ...medidas] = await medir(r, [{ inicio: periodo.inicio, fim: periodo.fim }, ...pontos]);

  const locais = await db.query(
    `SELECT coalesce(lc.nome, 'Sem local') AS rotulo, count(*)::int AS n
       FROM oto.pesquisa p LEFT JOIN oto.local_coleta lc ON lc.id = p.local_coleta_id
      WHERE ${r.where} GROUP BY 1 ORDER BY n DESC, 1`,
    r.params
  );
  const ate = new Date(Date.parse(periodo.fim) - 1).toISOString().slice(0, 10);
  return {
    filtros,
    emitidoEm: hoje,
    de: periodo.inicio,
    ate,
    ficticio: process.env.OTO_DADOS_FICTICIOS === "1",
    paineis,
    total,
    granularidade,
    serie: pontos.map((p, k) => ({ ...p, ...medidas[k] })),
    servicos: await conceitos(r),
    estados: await distribuicao(r, "estado"),
    comQuem: await distribuicao(r, "com_quem"),
    locais: locais.rows.map((l) => ({ ...l, percentual: pct(l.n, resumo.total) })),
    qualidade: {
      recebidas: resumo.total,
      emRevisao: resumo.revisao,
      comExcluida: resumo.excluida,
      pesquisadores: resumo.pesquisadores,
    },
  };
}
