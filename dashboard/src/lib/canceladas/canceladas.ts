// Entrevistas canceladas no app (RF23): registra o motivo; nenhuma resposta é enviada.
import { getMobilePool } from "@/lib/db";

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function lerData(v: unknown): Date | null {
  const d = typeof v === "string" ? new Date(v) : null;
  const ano = d?.getUTCFullYear();
  return d && ano && ano >= 2000 && ano <= 2100 ? d : null;
}

/** Devolve os ids registrados (reenviar não duplica). O que for inválido fica de fora. */
export async function registrarCanceladas(itens: unknown[]): Promise<string[]> {
  const aceitas: string[] = [];
  for (const item of itens) {
    const i = (item ?? {}) as Record<string, unknown>;
    const motivo = typeof i.motivo === "string" ? i.motivo.replaceAll("\0", "").trim() : "";
    const codigo = typeof i.pesquisador === "string" ? i.pesquisador.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    const inicio = lerData(i.iniciadaEm);
    const fim = lerData(i.canceladaEm);
    if (typeof i.id !== "string" || !UUID.test(i.id) || !motivo || motivo.length > 100 || !inicio || !fim || fim < inicio) continue;
    // Aceita o código antigo e o operador desativado: a entrevista aconteceu quando ele estava ativo.
    const r = await getMobilePool().query(
      `INSERT INTO oto.pesquisa_cancelada (id, pesquisador_id, motivo, iniciada_em, cancelada_em)
       SELECT $1, id, $3, $4, $5 FROM oto.usuario
        WHERE perfil = 'PESQUISADOR' AND (codigo_acesso = $2 OR id = (SELECT usuario_id FROM oto.codigo_antigo WHERE codigo = $2))
        LIMIT 1
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [i.id, codigo, motivo, inicio, fim]
    );
    const jaTinha = r.rowCount ? false : (await getMobilePool().query("SELECT 1 FROM oto.pesquisa_cancelada WHERE id = $1", [i.id])).rowCount;
    if (r.rowCount || jaTinha) aceitas.push(i.id);
  }
  return aceitas;
}
