// Pesquisa digitada no painel, recebida por outro meio (RF17).
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";
import { carregarCatalogo, carregarMunicipios, gravarRespostas, type Catalogo } from "@/lib/ingestao/ingestao";
import { ufDeEstado } from "@/lib/ingestao/conversao";
import { alertaDe, conceitoValido, problemaDe } from "@/lib/ingestao/validacao";

export const CANAIS = ["Telefone", "Formulário em papel", "E-mail", "Balcão", "Outro"];

export interface Resposta {
  chave: string;
  valor: unknown;
}

/** Confere todas as respostas e devolve os problemas e os alertas de curadoria. */
export function conferir(cat: Catalogo, municipios: Map<string, number>, respostas: Resposta[]) {
  const uf = ufDeEstado(respostas.find((r) => r.chave === "estado")?.valor);
  const ctx = { municipios, ufResidencia: uf };
  const problemas: string[] = [];
  const alertas: Array<{ chave: string; mensagem: string }> = [];
  for (const r of respostas) {
    if (cat.itens.has(r.chave)) {
      if (!conceitoValido(r.valor)) problemas.push(`${r.chave}: use Ótimo, Regular, Ruim, Não sei ou Não utilizei`);
      continue;
    }
    const pergunta = cat.perguntas.get(r.chave);
    if (!pergunta) {
      problemas.push(`Pergunta desconhecida: ${r.chave.slice(0, 40)}`);
      continue;
    }
    const problema = problemaDe(pergunta, r.valor, ctx);
    if (problema) problemas.push(problema);
    const alerta = problema ? null : alertaDe(pergunta, r.valor, ctx);
    if (alerta) alertas.push({ chave: r.chave, mensagem: alerta });
  }
  return { problemas, alertas };
}

async function proximoProtocolo(c: PoolClient): Promise<string> {
  const n = (await c.query("SELECT nextval('oto.seq_protocolo_manual')::int AS n")).rows[0].n;
  return `MAN-${String(n).padStart(4, "0")}`;
}

function lerDia(v: unknown): Date {
  const t = typeof v === "string" ? v : "";
  const d = new Date(`${t}T12:00:00-03:00`);
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(+d) && d.toISOString().slice(0, 10) === t;
  if (!valida || t < "2000-01-01") throw new ErroAdmin(400, "Informe a data da pesquisa.");
  if (t > new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)) throw new ErroAdmin(400, "A data não pode ser no futuro.");
  return d;
}

export async function inserirManual(autorId: string, dados: Record<string, unknown>): Promise<{ id: string; protocolo: string; alertas: number }> {
  const canal = String(dados.canal ?? "");
  if (!CANAIS.includes(canal)) throw new ErroAdmin(400, "Escolha o canal de recebimento.");
  const dia = lerDia(dados.data);
  const localId = dados.localId ? String(dados.localId) : null;
  if (localId && !/^\d{1,18}$/.test(localId)) throw new ErroAdmin(400, "Local de coleta inexistente.");
  const brutas = dados.respostas;
  if (typeof brutas !== "object" || brutas === null || Array.isArray(brutas)) throw new ErroAdmin(400, "Preencha as respostas.");
  const respostas: Resposta[] = Object.entries(brutas)
    .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([chave, valor]) => ({ chave, valor }));
  if (!respostas.length) throw new ErroAdmin(400, "Preencha pelo menos uma resposta.");
  const aceito = (v: unknown) => ["string", "number"].includes(typeof v) || (Array.isArray(v) && v.every((x) => typeof x === "string"));
  if (!respostas.every((r) => aceito(r.valor))) throw new ErroAdmin(400, "Resposta em formato inválido.");

  const [cat, municipios] = [await carregarCatalogo(undefined), await carregarMunicipios()];
  const { problemas, alertas } = conferir(cat, municipios, respostas);
  if (problemas.length) throw new ErroAdmin(400, problemas.slice(0, 3).join(" · "));
  const id = randomUUID();
  return withAuditTransaction(autorId, async (c) => {
    if (localId && !(await c.query("SELECT 1 FROM oto.local_coleta WHERE id = $1", [localId])).rowCount) {
      throw new ErroAdmin(400, "Local de coleta inexistente.");
    }
    const protocolo = await proximoProtocolo(c);
    await c.query(
      `INSERT INTO oto.pesquisa (id, protocolo, formulario_versao_id, origem, canal, registrada_por, local_coleta_id,
                                 iniciada_em, finalizada_em, status_curadoria)
       VALUES ($1, $2, $3, 'MANUAL', $4, $5, $6, $7, $7, $8::oto.status_curadoria)`,
      [id, protocolo, cat.versaoId, canal, autorId, localId, dia, alertas.length ? "EM_REVISAO" : "SEM_PENDENCIA"]
    );
    await gravarRespostas(c, cat, municipios, id, respostas, alertas);
    return { id, protocolo, alertas: alertas.length };
  });
}
