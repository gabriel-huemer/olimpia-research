// Operadores (pesquisadores de campo) no banco: cadastro, código de acesso e desempenho (RF11, RF20).
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { getDbPool, withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";

export interface Operador {
  id: string;
  nome: string;
  /** Credencial do app: só para quem tem a área Sistema. */
  codigo: string | null;
  ativo: boolean;
  local: { id: string; nome: string } | null;
  coletas: number;
  alertas: number;
  taxaAlerta: number;
  ultimoEnvio: string | null;
  /** Ativo e sem enviar há mais de um dia (RF11). */
  atrasado: boolean;
  porDia: number[];
}

const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L
const DIAS = [7, 30, 365];
const ID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export const lerDias = (v: string | null) => (DIAS.includes(Number(v)) ? Number(v) : 30);

export async function listarOperadores(dias: number, comCodigo: boolean): Promise<Operador[]> {
  const { rows } = await getDbPool().query(
    `SELECT u.id, u.nome, u.codigo_acesso, u.ativo, lc.id::text AS local_id, lc.nome AS local_nome,
            coalesce(c.coletas, 0)::int AS coletas, coalesce(c.alertas, 0)::int AS alertas, l.ultimo,
            (u.ativo AND (l.ultimo IS NULL OR l.ultimo < now() - interval '1 day')) AS atrasado,
            ARRAY(SELECT (SELECT count(*)::int FROM oto.pesquisa p
                           WHERE p.pesquisador_id = u.id
                             AND (p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date = d::date)
                    FROM generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date - 6,
                                         (now() AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day') d) AS por_dia
       FROM oto.usuario u
       LEFT JOIN oto.local_coleta lc ON lc.id = u.local_padrao_id
       LEFT JOIN LATERAL (
         SELECT count(*) AS coletas,
                count(*) FILTER (WHERE EXISTS (SELECT 1 FROM oto.resposta r JOIN oto.sinalizacao s ON s.resposta_id = r.id
                                                WHERE r.pesquisa_id = p.id)) AS alertas
           FROM oto.pesquisa p
          WHERE p.pesquisador_id = u.id AND p.iniciada_em >= now() - make_interval(days => $1)) c ON true
       LEFT JOIN LATERAL (SELECT max(iniciado_em) AS ultimo FROM oto.lote_sincronizacao WHERE usuario_id = u.id) l ON true
      WHERE u.perfil = 'PESQUISADOR'
      ORDER BY u.ativo DESC, c.coletas DESC NULLS LAST, u.nome`,
    [dias]
  );
  return rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    codigo: comCodigo ? l.codigo_acesso : null,
    ativo: l.ativo,
    local: l.local_id ? { id: l.local_id, nome: l.local_nome } : null,
    coletas: l.coletas,
    alertas: l.alertas,
    taxaAlerta: l.coletas ? Math.round((l.alertas / l.coletas) * 1000) / 10 : 0,
    ultimoEnvio: l.ultimo ? l.ultimo.toISOString() : null,
    atrasado: l.atrasado,
    porDia: l.por_dia,
  }));
}

export async function listarLocais(): Promise<Array<{ id: string; nome: string }>> {
  return (await getDbPool().query("SELECT id::text AS id, nome FROM oto.local_coleta WHERE ativo ORDER BY nome")).rows;
}

const limpo = (v: unknown) => (typeof v === "string" ? v.replace(/[\0\s]+/g, " ").trim() : "");

function lerNome(v: unknown): string {
  const nome = limpo(v);
  if (!nome || nome.length > 150) throw new ErroAdmin(400, "Informe o nome (até 150 caracteres).");
  return nome;
}

/** Local pelo id, ou um local novo pelo nome. */
async function resolverLocal(c: PoolClient, dados: { localId?: unknown; novoLocal?: unknown }): Promise<string> {
  const novo = limpo(dados.novoLocal);
  if (novo) {
    if (novo.length > 120) throw new ErroAdmin(400, "Nome do local com até 120 caracteres.");
    const r = await c.query(
      "INSERT INTO oto.local_coleta (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET ativo = true RETURNING id::text AS id",
      [novo]
    );
    return r.rows[0].id;
  }
  const id = String(dados.localId ?? "");
  if (!/^\d{1,18}$/.test(id)) throw new ErroAdmin(400, "Escolha o local de coleta.");
  const r = await c.query("SELECT 1 FROM oto.local_coleta WHERE id = $1 AND ativo", [id]);
  if (!r.rowCount) throw new ErroAdmin(400, "Local de coleta inexistente.");
  return id;
}

async function gerarCodigo(c: PoolClient): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const codigo = "OTO" + Array.from({ length: 3 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
    const r = await c.query(
      "SELECT 1 FROM oto.usuario WHERE codigo_acesso = $1 UNION ALL SELECT 1 FROM oto.codigo_antigo WHERE codigo = $1",
      [codigo]
    );
    if (!r.rowCount) return codigo;
  }
  throw new ErroAdmin(503, "Não foi possível gerar um código livre. Tente de novo.");
}

export async function criarOperador(autorId: string, dados: Record<string, unknown>): Promise<{ id: string; codigo: string }> {
  const nome = lerNome(dados.nome);
  return withAuditTransaction(autorId, async (c) => {
    const local = await resolverLocal(c, dados);
    const codigo = await gerarCodigo(c);
    const r = await c.query(
      "INSERT INTO oto.usuario (nome, perfil, codigo_acesso, local_padrao_id) VALUES ($1, 'PESQUISADOR', $2, $3) RETURNING id",
      [nome, codigo, local]
    );
    return { id: r.rows[0].id, codigo };
  });
}

export async function editarOperador(autorId: string, id: string, dados: Record<string, unknown>): Promise<{ codigo?: string }> {
  if (!ID.test(id)) throw new ErroAdmin(404, "Operador não encontrado.");
  if (dados.ativo !== undefined && typeof dados.ativo !== "boolean") throw new ErroAdmin(400, "ativo deve ser true/false.");
  const nome = dados.nome === undefined ? null : lerNome(dados.nome);
  const mudaLocal = dados.localId !== undefined || dados.novoLocal !== undefined;
  const redefinir = dados.redefinirCodigo === true;
  if (dados.ativo === undefined && nome === null && !mudaLocal && !redefinir) throw new ErroAdmin(400, "Nada para alterar.");
  return withAuditTransaction(autorId, async (c) => {
    const atual = await c.query(
      "SELECT codigo_acesso FROM oto.usuario WHERE id = $1 AND perfil = 'PESQUISADOR' FOR UPDATE",
      [id]
    );
    if (!atual.rowCount) throw new ErroAdmin(404, "Operador não encontrado.");
    const local = mudaLocal ? await resolverLocal(c, dados) : null;
    const codigo = redefinir ? await gerarCodigo(c) : null;
    if (codigo) {
      await c.query("INSERT INTO oto.codigo_antigo (codigo, usuario_id) VALUES ($1, $2)", [atual.rows[0].codigo_acesso, id]);
    }
    await c.query(
      `UPDATE oto.usuario SET nome = coalesce($2, nome), ativo = coalesce($3, ativo),
              local_padrao_id = coalesce($4, local_padrao_id), codigo_acesso = coalesce($5, codigo_acesso) WHERE id = $1`,
      [id, nome, dados.ativo ?? null, local, codigo]
    );
    return codigo ? { codigo } : {};
  });
}

export interface VisaoGeral {
  /** Entrevistas canceladas nos últimos 7 dias, por motivo (RF23). */
  canceladas: Array<{ motivo: string; n: number }>;
  respostasNoAno: number;
  hoje: number;
  pendentes: number;
  diasMaisAntiga: number | null;
  atrasados: number;
  porDia: Array<{ dia: string; n: number }>;
  ultimoProtocolo: string | null;
  formulario: { nome: string; versao: number; secoes: number } | null;
}

export async function visaoGeral(): Promise<VisaoGeral> {
  const db = getDbPool();
  const hoje = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";
  const dia = "(p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date";
  const [t, s, dias, ultimo, form, atrasados, canceladas] = await Promise.all([
    db.query(
      `SELECT count(*) FILTER (WHERE extract(year FROM ${dia}) = extract(year FROM ${hoje}))::int AS ano,
              count(*) FILTER (WHERE ${dia} = ${hoje})::int AS hoje FROM oto.pesquisa p`
    ),
    db.query(
      `SELECT count(DISTINCT resposta_id)::int AS n, floor(extract(epoch FROM now() - min(criada_em)) / 86400)::int AS dias
         FROM oto.sinalizacao WHERE status = 'PENDENTE'`
    ),
    db.query(
      `SELECT to_char(d, 'DD/MM') AS dia, (SELECT count(*)::int FROM oto.pesquisa p WHERE ${dia} = d::date) AS n
         FROM generate_series(${hoje} - 6, ${hoje}, interval '1 day') d ORDER BY d`
    ),
    db.query("SELECT protocolo FROM oto.pesquisa ORDER BY recebida_em DESC LIMIT 1"),
    db.query(
      `SELECT f.nome, v.numero, (SELECT count(*)::int FROM oto.secao sc WHERE sc.formulario_versao_id = v.id) AS secoes
         FROM oto.formulario_versao v JOIN oto.formulario f ON f.id = v.formulario_id
        WHERE v.publicada AND f.ativo ORDER BY v.numero DESC, v.id DESC LIMIT 1`
    ),
    db.query(
      `SELECT count(*)::int AS n FROM oto.usuario u WHERE u.perfil = 'PESQUISADOR' AND u.ativo
          AND NOT EXISTS (SELECT 1 FROM oto.lote_sincronizacao l WHERE l.usuario_id = u.id AND l.iniciado_em >= now() - interval '1 day')`
    ),
    db.query(
      `SELECT motivo, count(*)::int AS n FROM oto.pesquisa_cancelada
        WHERE cancelada_em >= now() - interval '7 days' GROUP BY motivo ORDER BY n DESC, motivo`
    ),
  ]);
  const f = form.rows[0];
  return {
    respostasNoAno: t.rows[0].ano,
    hoje: t.rows[0].hoje,
    pendentes: s.rows[0].n,
    diasMaisAntiga: s.rows[0].dias,
    atrasados: atrasados.rows[0].n,
    porDia: dias.rows,
    canceladas: canceladas.rows,
    ultimoProtocolo: ultimo.rows[0]?.protocolo ?? null,
    formulario: f ? { nome: f.nome, versao: f.numero, secoes: f.secoes } : null,
  };
}
