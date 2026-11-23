// Lista de pesquisas coletadas, com filtros (RF18) e exportação com as respostas (RF24).
import { anosComColeta } from "@/lib/anos";
import { getDbPool } from "@/lib/db";
import { diaSql, hojeLocal, opcoesPeriodo, resolverPeriodo } from "@/lib/periodo";

export interface PesquisaLinha {
  id: string;
  protocolo: string;
  cidade: string | null;
  operador: string;
  local: string | null;
  coletada: string;
  origem: "CAMPO" | "MANUAL" | "IMPORTACAO";
  canal: string | null;
  situacao: "SEM_PENDENCIA" | "EM_REVISAO" | "CONCLUIDA";
}

export interface OpcoesPesquisas {
  periodos: string[];
  operadores: Array<{ id: string; nome: string }>;
  locais: Array<{ id: string; nome: string }>;
}

const PAGINA = 50;
const MAX_EXPORTACAO = 5000;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const INICIO_LOCAL = "(p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')";
const NOME_OPERADOR = "coalesce(u.nome, a.nome, '—')";
const JUNCOES = `FROM oto.pesquisa p
       LEFT JOIN oto.usuario u ON u.id = p.pesquisador_id
       LEFT JOIN oto.usuario a ON a.id = p.registrada_por
       LEFT JOIN oto.local_coleta lc ON lc.id = p.local_coleta_id`;

function montar(q: URLSearchParams): { where: string; params: unknown[] } {
  const cond = ["TRUE"];
  const params: unknown[] = [];
  const add = (v: unknown) => `$${params.push(v)}`;
  const periodo = q.get("periodo") ?? "Tudo";
  if (periodo !== "Tudo") {
    const { inicio, fim } = resolverPeriodo(periodo, hojeLocal());
    cond.push(`p.iniciada_em >= ${diaSql(add(inicio))} AND p.iniciada_em < ${diaSql(add(fim))}`);
  }
  const operador = q.get("operador") ?? "";
  if (UUID.test(operador)) cond.push(`coalesce(p.pesquisador_id, p.registrada_por) = ${add(operador)}`);
  const local = q.get("local") ?? "";
  if (/^\d{1,18}$/.test(local)) cond.push(`p.local_coleta_id = ${add(local)}`);
  const situacao = q.get("situacao") ?? "";
  if (["SEM_PENDENCIA", "EM_REVISAO", "CONCLUIDA"].includes(situacao)) cond.push(`p.status_curadoria = ${add(situacao)}::oto.status_curadoria`);
  const origem = q.get("origem") ?? "";
  if (["CAMPO", "MANUAL", "IMPORTACAO"].includes(origem)) cond.push(`p.origem = ${add(origem)}::oto.origem_pesquisa`);
  const busca = (q.get("busca") ?? "").replaceAll("\0", "").trim().slice(0, 60);
  if (busca) cond.push(`strpos(lower(p.protocolo), lower(${add(busca)})) > 0`);
  return { where: cond.join(" AND "), params };
}

export async function listarPesquisas(q: URLSearchParams): Promise<{ total: number; pagina: number; paginas: number; pesquisas: PesquisaLinha[] }> {
  const { where, params } = montar(q);
  const db = getDbPool();
  const total: number = (await db.query(`SELECT count(*)::int AS n ${JUNCOES} WHERE ${where}`, params)).rows[0].n;
  const paginas = Math.max(1, Math.ceil(total / PAGINA));
  const pedida = Math.trunc(Number(q.get("pagina"))) || 1;
  const pagina = Math.min(Math.max(1, pedida), paginas);
  const { rows } = await db.query(
    `SELECT p.id, p.protocolo, ${NOME_OPERADOR} AS operador, lc.nome AS local, p.origem, p.canal, p.status_curadoria AS situacao,
            to_char(${INICIO_LOCAL}, 'DD/MM/YYYY HH24:MI') AS coletada,
            (SELECT m.nome || ', ' || m.uf_sigla FROM oto.resposta r
               JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = 'cidade'
               JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
               JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
              WHERE r.pesquisa_id = p.id LIMIT 1) AS cidade
       ${JUNCOES} WHERE ${where}
      ORDER BY p.iniciada_em DESC, p.id LIMIT ${PAGINA} OFFSET ${(pagina - 1) * PAGINA}`,
    params
  );
  return { total, pagina, paginas, pesquisas: rows };
}

export async function opcoesPesquisas(): Promise<OpcoesPesquisas> {
  const db = getDbPool();
  const [anos, operadores, locais] = await Promise.all([
    anosComColeta(),
    db.query(
      `SELECT id, nome FROM oto.usuario u
        WHERE EXISTS (SELECT 1 FROM oto.pesquisa p WHERE p.pesquisador_id = u.id OR p.registrada_por = u.id) ORDER BY nome`
    ),
    db.query("SELECT id::text AS id, nome FROM oto.local_coleta ORDER BY nome"),
  ]);
  return { periodos: opcoesPeriodo(["Tudo", "Mês atual", "Últimos 30 dias"], anos, hojeLocal()), operadores: operadores.rows, locais: locais.rows };
}

/** Uma linha por pesquisa e uma coluna por pergunta. Respostas não validadas saem marcadas na coluna Situação. */
export async function exportarPesquisas(q: URLSearchParams): Promise<Array<Record<string, unknown>>> {
  const { where, params } = montar(q);
  const db = getDbPool();
  const perguntas = await db.query(
    `SELECT DISTINCT ON (pg.codigo) pg.codigo, s.ordem AS so, pg.ordem AS po
       FROM oto.pergunta pg JOIN oto.secao s ON s.id = pg.secao_id WHERE pg.tipo <> 'MATRIZ_AVALIACAO' ORDER BY pg.codigo, pg.id DESC`
  );
  const codigos: string[] = perguntas.rows.sort((a, b) => a.so - b.so || a.po - b.po).map((l) => l.codigo);
  const itens = (await db.query("SELECT codigo, nome FROM oto.item_avaliacao WHERE codigo IS NOT NULL ORDER BY tipo, codigo")).rows;
  const { rows } = await db.query(
    `SELECT p.protocolo, ${NOME_OPERADOR} AS operador, lc.nome AS local, p.origem, p.status_curadoria AS situacao,
            to_char(${INICIO_LOCAL}, 'DD/MM/YYYY HH24:MI') AS coletada,
            (SELECT jsonb_object_agg(x.codigo, x.valor) FROM (
               SELECT pg.codigo, string_agg(coalesce(o.rotulo, m.nome || ', ' || m.uf_sigla, rv.valor_numero::float8::text,
                        to_char(rv.valor_data, 'DD/MM/YYYY'), rv.valor_texto), '; ' ORDER BY rv.id) AS valor
                 FROM oto.resposta r JOIN oto.pergunta pg ON pg.id = r.pergunta_id
                 JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
                 LEFT JOIN oto.opcao o ON o.id = rv.opcao_id LEFT JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
                WHERE r.pesquisa_id = p.id AND r.situacao <> 'EXCLUIDA' GROUP BY pg.codigo) x) AS respostas,
            (SELECT jsonb_object_agg(i.codigo, av.conceito) FROM oto.resposta r
               JOIN oto.avaliacao_item av ON av.resposta_id = r.id JOIN oto.item_avaliacao i ON i.id = av.item_avaliacao_id
              WHERE r.pesquisa_id = p.id AND i.codigo IS NOT NULL) AS avaliacoes
       ${JUNCOES} WHERE ${where} ORDER BY p.iniciada_em DESC, p.id LIMIT ${MAX_EXPORTACAO}`,
    params
  );
  return rows.map((l) => ({
    Protocolo: l.protocolo,
    Coletada: l.coletada,
    Operador: l.operador,
    Local: l.local ?? "",
    Origem: l.origem,
    Situacao: l.situacao,
    ...Object.fromEntries(codigos.map((c) => [c, l.respostas?.[c] ?? ""])),
    ...Object.fromEntries(itens.map((i) => [`Avaliação [${i.nome}]`, l.avaliacoes?.[i.codigo] ?? ""])),
  }));
}
