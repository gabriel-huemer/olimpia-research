import { getDbPool, isDatabaseAvailable } from "@/lib/db";
import type { PesquisaColetada } from "@/lib/mockAndSeedData";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Lista de pesquisas coletadas, lida do banco (as 200 mais recentes). Sem banco: lista vazia. */
export async function listarPesquisas(): Promise<PesquisaColetada[]> {
  if (!(await isDatabaseAvailable())) return [];
  const { rows } = await getDbPool().query(
    `SELECT p.id, p.protocolo, u.nome AS operador, lc.nome AS local, p.status_curadoria,
            to_char(p.iniciada_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS coletada,
            extract(month FROM p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::int AS mes,
            extract(year FROM p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::int AS ano,
            (SELECT m.nome || ', ' || m.uf_sigla FROM oto.resposta r
               JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = 'cidade'
               JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
               JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
              WHERE r.pesquisa_id = p.id LIMIT 1) AS origem
     FROM oto.pesquisa p
     LEFT JOIN oto.usuario u ON u.id = p.pesquisador_id
     LEFT JOIN oto.local_coleta lc ON lc.id = p.local_coleta_id
     ORDER BY p.iniciada_em DESC LIMIT 200`
  );
  return rows.map((r) => ({
    id: r.id,
    protocolo: r.protocolo,
    origem: r.origem ?? "—",
    operador: r.operador ?? "—",
    local: r.local ?? "—",
    coletada: r.coletada,
    periodo: `${MESES[r.mes - 1]}/${r.ano}`,
    situacao: r.status_curadoria === "EM_REVISAO" ? "Sinalizada" : "Sincronizada",
  }));
}
