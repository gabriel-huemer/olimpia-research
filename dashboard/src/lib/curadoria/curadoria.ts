// Curadoria (RF19): fila de respostas sinalizadas e decisão do gestor, direto no PostgreSQL.
import type { PoolClient } from "pg";
import { getDbPool, isDatabaseAvailable, withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";
import { podeAcessar } from "@/lib/auth/permissoes";
import type { UsuarioSessao } from "@/lib/auth/servidor";
import { foraDaFaixa, validarNovoValor, type Faixa } from "./valor";
import type { Decisao, DetalheCuradoria, ItemFila } from "./tipos";

const MAX_MOTIVO = 500;
const SITUACAO: Record<Decisao, string> = { APROVAR: "APROVADA", CORRIGIR: "CORRIGIDA", EXCLUIR: "EXCLUIDA" };
const COLETADA = "to_char(ps.iniciada_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')";

const naoEncontrada = () => new ErroAdmin(404, "Sinalização não encontrada.");

/** bigint positivo em texto; qualquer outra coisa é tratada como inexistente. */
function idValido(id: string): string {
  if (!/^\d{1,18}$/.test(id)) throw naoEncontrada();
  return id;
}

/** Uma linha por resposta (os alertas dela são decididos juntos), da mais antiga para a mais nova. */
export async function listarFila(): Promise<ItemFila[]> {
  const { rows } = await getDbPool().query(
    `SELECT min(s.id)::text AS id, ps.protocolo, pg.enunciado AS pergunta,
            array_agg(s.motivo ORDER BY s.id) AS motivos, coalesce(u.nome, '—') AS operador,
            ${COLETADA} AS coletada, min(s.criada_em) AS criada_em
       FROM oto.sinalizacao s
       JOIN oto.resposta r ON r.id = s.resposta_id
       JOIN oto.pergunta pg ON pg.id = r.pergunta_id
       JOIN oto.pesquisa ps ON ps.id = r.pesquisa_id
       LEFT JOIN oto.usuario u ON u.id = ps.pesquisador_id
      WHERE s.status = 'PENDENTE'
      GROUP BY r.id, ps.id, pg.id, u.id
      ORDER BY min(s.criada_em), min(s.id)`
  );
  return rows.map((r) => ({
    id: r.id,
    protocolo: r.protocolo,
    pergunta: r.pergunta,
    motivos: r.motivos,
    operador: r.operador,
    coletada: r.coletada,
    criadaEm: r.criada_em.toISOString(),
  }));
}

export async function contarPendentes(): Promise<number> {
  if (!(await isDatabaseAvailable())) return 0;
  const { rows } = await getDbPool().query(
    "SELECT count(DISTINCT resposta_id)::int AS n FROM oto.sinalizacao WHERE status = 'PENDENTE'"
  );
  return rows[0].n;
}

function textoOriginal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "Sem valor";
  if (Array.isArray(v)) return v.join(", ");
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function detalhar(idBruto: string): Promise<DetalheCuradoria> {
  const id = idValido(idBruto);
  const db = getDbPool();
  const { rows } = await db.query(
    `SELECT s.id::text AS id, s.resposta_id, s.status, s.valor_original, s.justificativa, cur.nome AS curador,
            ps.id AS pesquisa_id, ps.protocolo, coalesce(u.nome, '—') AS operador, coalesce(lc.nome, '—') AS local,
            ${COLETADA} AS coletada, pg.enunciado AS pergunta, pg.tipo,
            al.motivos, al.mantido
       FROM oto.sinalizacao s
       JOIN oto.resposta r ON r.id = s.resposta_id
       JOIN oto.pergunta pg ON pg.id = r.pergunta_id
       JOIN oto.pesquisa ps ON ps.id = r.pesquisa_id
       LEFT JOIN oto.usuario u ON u.id = ps.pesquisador_id
       LEFT JOIN oto.usuario cur ON cur.id = s.curador_id
       LEFT JOIN oto.local_coleta lc ON lc.id = ps.local_coleta_id
       CROSS JOIN LATERAL (
         SELECT array_agg(x.motivo ORDER BY x.id) AS motivos,
                coalesce(bool_or(x.decisao_no_app = 'MANTIDA_E_SINALIZADA'), false) AS mantido
           FROM oto.sinalizacao x WHERE x.resposta_id = s.resposta_id) al
      WHERE s.id = $1`,
    [id]
  );
  const d = rows[0];
  if (!d) throw naoEncontrada();

  const resp = await db.query(
    `SELECT r.id, pg.codigo, pg.enunciado, pg.tipo, v.texto, v.numero, a.texto AS avaliacoes
       FROM oto.resposta r
       JOIN oto.pergunta pg ON pg.id = r.pergunta_id
       JOIN oto.secao sc ON sc.id = pg.secao_id
       LEFT JOIN LATERAL (
         SELECT string_agg(concat_ws(': ', o.rotulo, m.nome || ', ' || m.uf_sigla, pa.nome,
                                     rv.valor_numero::float8::text, to_char(rv.valor_data, 'DD/MM/YYYY'),
                                     CASE rv.valor_booleano WHEN true THEN 'Sim' WHEN false THEN 'Não' END,
                                     rv.valor_texto), '; ' ORDER BY rv.id) AS texto,
                max(rv.valor_numero)::float8 AS numero
           FROM oto.resposta_valor rv
           LEFT JOIN oto.opcao o ON o.id = rv.opcao_id
           LEFT JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
           LEFT JOIN oto.pais pa ON pa.codigo_iso = rv.pais_iso
          WHERE rv.resposta_id = r.id) v ON true
       LEFT JOIN LATERAL (
         SELECT string_agg(i.nome || ': ' || CASE ai.conceito WHEN 'OTIMO' THEN 'Ótimo' WHEN 'REGULAR' THEN 'Regular'
                  WHEN 'RUIM' THEN 'Ruim' WHEN 'NAO_SEI' THEN 'Não sei' ELSE 'Não utilizei' END, '; ' ORDER BY i.id) AS texto
           FROM oto.avaliacao_item ai JOIN oto.item_avaliacao i ON i.id = ai.item_avaliacao_id
          WHERE ai.resposta_id = r.id) a ON true
      WHERE r.pesquisa_id = $1
      ORDER BY sc.ordem, pg.ordem`,
    [d.pesquisa_id]
  );

  return {
    id: d.id,
    protocolo: d.protocolo,
    origem: resp.rows.find((r) => r.codigo === "cidade")?.texto ?? "—",
    operador: d.operador,
    local: d.local,
    coletada: d.coletada,
    pergunta: d.pergunta,
    tipo: d.tipo,
    motivos: d.motivos,
    mantidoPeloPesquisador: d.mantido,
    valorOriginal: textoOriginal(d.valor_original),
    status: d.status,
    curador: d.curador,
    justificativa: d.justificativa,
    respostas: resp.rows.map((r) => ({
      pergunta: r.enunciado,
      valor:
        (r.tipo === "MOEDA" && r.numero !== null ? reais(r.numero) : r.texto) ?? r.avaliacoes ?? "Sem valor",
      sinalizada: r.id === d.resposta_id,
    })),
  };
}

function lerCorpo(corpo: unknown): { decisao: Decisao; motivo: string; novoValor: unknown } {
  const c = (corpo && typeof corpo === "object" ? corpo : {}) as Record<string, unknown>;
  const decisao = c.decisao;
  if (decisao !== "APROVAR" && decisao !== "CORRIGIR" && decisao !== "EXCLUIR") {
    throw new ErroAdmin(400, "Decisão inválida.");
  }
  if (c.motivo !== undefined && c.motivo !== null && typeof c.motivo !== "string") {
    throw new ErroAdmin(400, "Motivo inválido.");
  }
  const motivo = typeof c.motivo === "string" ? c.motivo.trim() : "";
  if (motivo.length > MAX_MOTIVO) throw new ErroAdmin(400, `O motivo pode ter até ${MAX_MOTIVO} caracteres.`);
  if (decisao !== "APROVAR" && !motivo) throw new ErroAdmin(400, "Informe o motivo.");
  return { decisao, motivo, novoValor: c.novoValor };
}

async function gravarValor(c: PoolClient, respostaId: string, numero: number) {
  const r = await c.query(
    `UPDATE oto.resposta_valor SET valor_numero = $2, valor_texto = NULL
      WHERE id = (SELECT min(id) FROM oto.resposta_valor WHERE resposta_id = $1)`,
    [respostaId, numero]
  );
  if (!r.rowCount) {
    await c.query("INSERT INTO oto.resposta_valor (resposta_id, valor_numero) VALUES ($1, $2)", [respostaId, numero]);
  }
}

/** Aprova, corrige ou exclui a resposta sinalizada. Tudo ou nada; o autor é sempre o da sessão. */
export async function decidir(usuario: UsuarioSessao, idBruto: string, corpo: unknown): Promise<{ aviso: string | null }> {
  const { decisao, motivo, novoValor } = lerCorpo(corpo);
  // RN18: excluir exige também a área Sistema (a rota já exige Coleta).
  if (decisao === "EXCLUIR" && !podeAcessar(usuario.areas, "sistema")) {
    throw new ErroAdmin(403, "Só quem tem acesso a Sistema pode excluir respostas.");
  }
  const id = idValido(idBruto);

  return withAuditTransaction(usuario.id, async (c) => {
    // Trava a pesquisa inteira: decisões simultâneas em respostas dela precisam enxergar umas às outras.
    const p = await c.query(
      `SELECT ps.id FROM oto.pesquisa ps
        WHERE ps.id = (SELECT r.pesquisa_id FROM oto.sinalizacao s JOIN oto.resposta r ON r.id = s.resposta_id WHERE s.id = $1)
          FOR UPDATE`,
      [id]
    );
    if (!p.rowCount) throw naoEncontrada();
    const { rows } = await c.query(
      `SELECT s.status, s.resposta_id, pg.tipo, rg.parametros
         FROM oto.sinalizacao s
         JOIN oto.resposta r ON r.id = s.resposta_id
         JOIN oto.pergunta pg ON pg.id = r.pergunta_id
         LEFT JOIN oto.regra_validacao rg ON rg.id = s.regra_validacao_id AND rg.tipo = 'FAIXA_NUMERICA'
        WHERE s.id = $1`,
      [id]
    );
    const s = rows[0];
    if (s.status !== "PENDENTE") throw new ErroAdmin(409, "Esta resposta já foi revisada.");

    let numero: number | null = null;
    let aviso: string | null = null;
    if (decisao === "CORRIGIR") {
      const v = validarNovoValor(s.tipo, novoValor);
      if (!v.ok) throw new ErroAdmin(400, v.motivo);
      numero = v.numero;
      await gravarValor(c, s.resposta_id, numero);
      if (foraDaFaixa(numero, s.parametros as Faixa | null)) aviso = "O novo valor também está fora da faixa esperada.";
    }

    const situacao = SITUACAO[decisao];
    await c.query("UPDATE oto.resposta SET situacao = $2::oto.situacao_resposta WHERE id = $1", [s.resposta_id, situacao]);
    await c.query(
      `UPDATE oto.sinalizacao SET status = $2::oto.status_sinalizacao, curador_id = $3, curada_em = now(),
              justificativa = $4, valor_corrigido = $5::jsonb
        WHERE resposta_id = $1 AND status = 'PENDENTE'`,
      [s.resposta_id, situacao, usuario.id, motivo || null, numero === null ? null : JSON.stringify(numero)]
    );
    await c.query(
      `UPDATE oto.pesquisa SET status_curadoria = 'CONCLUIDA'
        WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM oto.sinalizacao s JOIN oto.resposta r ON r.id = s.resposta_id
                                       WHERE r.pesquisa_id = $1 AND s.status = 'PENDENTE')`,
      [p.rows[0].id]
    );
    return { aviso };
  });
}
