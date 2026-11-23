// Consulta somente leitura do log_auditoria (RF15).
import { getDbPool } from "@/lib/db";
import { ACOES, descrever, type Acao } from "./texto";

export interface RegistroAuditoria {
  id: string;
  quando: string;
  usuario: string;
  acao: Acao;
  item: string;
  protocolo: string | null;
  alteracao: string;
}

export interface FiltroAuditoria {
  usuario: string | null;
  acao: string | null;
  dias: number | null;
  busca: string;
  antesDe: string | null;
  limite: number;
}

const PAGINA = 100;
const MAXIMO = 5000;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const DIAS = [7, 30, 365];

export function lerFiltro(q: URLSearchParams): FiltroAuditoria {
  const usuario = q.get("usuario") ?? "";
  const antes = q.get("antes") ?? "";
  const dias = Number(q.get("dias"));
  const limite = Math.trunc(Number(q.get("limite")));
  return {
    usuario: UUID.test(usuario) || usuario === "sistema" ? usuario : null,
    acao: (ACOES as readonly string[]).includes(q.get("acao") ?? "") ? q.get("acao") : null,
    dias: DIAS.includes(dias) ? dias : null,
    busca: (q.get("busca") ?? "").replaceAll("\0", "").trim().slice(0, 60),
    antesDe: /^\d{1,18}$/.test(antes) ? antes : null,
    limite: limite > 0 ? Math.min(limite, MAXIMO) : PAGINA,
  };
}

const SQL_ACAO: Record<Acao, string> = {
  Inseriu: "l.acao = 'INSERT'",
  Alterou: "l.acao = 'UPDATE' AND NOT (l.entidade = 'sinalizacao' AND l.dados_antes->>'status' = 'PENDENTE' AND l.dados_depois->>'status' <> 'PENDENTE')",
  Aprovou: "l.entidade = 'sinalizacao' AND l.acao = 'UPDATE' AND l.dados_antes->>'status' = 'PENDENTE' AND l.dados_depois->>'status' = 'APROVADA'",
  Corrigiu: "l.entidade = 'sinalizacao' AND l.acao = 'UPDATE' AND l.dados_antes->>'status' = 'PENDENTE' AND l.dados_depois->>'status' = 'CORRIGIDA'",
  Excluiu: "(l.acao = 'DELETE' OR (l.entidade = 'sinalizacao' AND l.acao = 'UPDATE' AND l.dados_antes->>'status' = 'PENDENTE' AND l.dados_depois->>'status' = 'EXCLUIDA'))",
};

export async function consultarAuditoria(f: FiltroAuditoria): Promise<{ registros: RegistroAuditoria[]; proximo: string | null }> {
  const cond: string[] = ["TRUE"];
  const params: unknown[] = [];
  const add = (v: unknown) => `$${params.push(v)}`;
  if (f.usuario === "sistema") cond.push("l.usuario_id IS NULL");
  else if (f.usuario) cond.push(`l.usuario_id = ${add(f.usuario)}`);
  if (f.acao) cond.push(SQL_ACAO[f.acao as Acao]);
  if (f.dias) cond.push(`l.ocorrido_em >= now() - make_interval(days => ${add(f.dias)})`);
  if (f.antesDe) cond.push(`l.id < ${add(f.antesDe)}`);
  if (f.busca) {
    const b = add(f.busca);
    cond.push(`(strpos(lower(coalesce(ps.protocolo, '')), lower(${b})) > 0 OR strpos(lower(l.entidade_id), lower(${b})) > 0
                OR strpos(lower(coalesce(l.dados_depois->>'nome', l.dados_antes->>'nome', '')), lower(${b})) > 0)`);
  }
  const { rows } = await getDbPool().query(
    `SELECT l.id::text AS id, l.acao, l.entidade, l.dados_antes, l.dados_depois, coalesce(u.nome, 'Sistema') AS usuario,
            to_char(l.ocorrido_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS quando, ps.protocolo
       FROM oto.log_auditoria l
       LEFT JOIN oto.usuario u ON u.id = l.usuario_id
       LEFT JOIN oto.resposta r ON r.id = CASE
            WHEN l.entidade IN ('sinalizacao', 'resposta_valor', 'avaliacao_item')
            THEN (coalesce(l.dados_depois, l.dados_antes)->>'resposta_id')::bigint END
       LEFT JOIN oto.pesquisa ps ON ps.id = CASE
            WHEN l.entidade = 'pesquisa' THEN l.entidade_id::uuid
            WHEN l.entidade = 'resposta' THEN (coalesce(l.dados_depois, l.dados_antes)->>'pesquisa_id')::uuid
            ELSE r.pesquisa_id END
      WHERE ${cond.join(" AND ")}
      ORDER BY l.id DESC LIMIT ${f.limite + 1}`,
    params
  );
  const pagina = rows.slice(0, f.limite);
  return {
    registros: pagina.map((l) => ({
      id: l.id,
      quando: l.quando,
      usuario: l.usuario,
      protocolo: l.protocolo,
      ...descrever(l.entidade, l.acao, l.dados_antes, l.dados_depois),
    })),
    proximo: rows.length > f.limite ? pagina[pagina.length - 1].id : null,
  };
}

/** Quem pode aparecer no filtro: contas que já registraram algo. */
export async function autores(): Promise<Array<{ id: string; nome: string }>> {
  const { rows } = await getDbPool().query(
    `SELECT u.id, u.nome FROM oto.usuario u
      WHERE EXISTS (SELECT 1 FROM oto.log_auditoria l WHERE l.usuario_id = u.id) ORDER BY u.nome`
  );
  return rows;
}
