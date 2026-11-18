import type { PoolClient } from "pg";
import { getMobilePool, withTransaction } from "@/lib/db";
import {
  chaveMunicipio,
  conceitoDe,
  converterValor,
  ufDeEstado,
  type Opcao,
  type TipoPergunta,
} from "./conversao";

// Ingestão do lote de pesquisas do app (UC05 / RF08): grava no PostgreSQL de forma idempotente.

export interface PesquisaPayload {
  id: string;
  protocolo: number | string;
  pesquisador: string;
  local?: string;
  dispositivo: string;
  versaoQuestionario?: number;
  iniciadaEm: string;
  finalizadaEm?: string | null;
  respostas?: Array<{ chave: string; valor: unknown }>;
  sinalizacoes?: Array<{ regra?: string; chave: string; titulo?: string; mensagem?: string; status?: string }>;
}

export interface ResultadoLote {
  /** Inclui as duplicadas: o app precisa marcá-las como enviadas. */
  aceitas: string[];
  duplicadas: string[];
  rejeitadas: Record<string, string>;
}

class Rejeicao extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Pergunta {
  id: number;
  codigo: string;
  tipo: TipoPergunta;
  grupo: string | null;
  opcoes: Opcao[];
  regraId: number | null;
}
interface Catalogo {
  versaoId: number;
  perguntas: Map<string, Pergunta>;
  itens: Map<string, { id: number; grupo: string }>;
}
interface Usuario {
  id: string;
  codigo: string;
  local_padrao_id: number | null;
}

let municipiosCache: Map<string, number> | null = null;

async function carregarMunicipios(): Promise<Map<string, number>> {
  if (municipiosCache) return municipiosCache;
  const { rows } = await getMobilePool().query("SELECT codigo_ibge, nome, uf_sigla FROM oto.municipio");
  const mapa = new Map<string, number>();
  for (const r of rows) mapa.set(chaveMunicipio(r.uf_sigla, r.nome), r.codigo_ibge);
  if (mapa.size > 0) municipiosCache = mapa;
  return mapa;
}

async function carregarCatalogo(versao: number | undefined): Promise<Catalogo> {
  const db = getMobilePool();
  const v = await db.query(
    `SELECT id FROM oto.formulario_versao WHERE publicada AND ($1::int IS NULL OR numero = $1)
     ORDER BY numero DESC, id DESC LIMIT 1`,
    [versao ?? null]
  );
  const versaoId: number | undefined =
    v.rows[0]?.id ??
    (await db.query("SELECT id FROM oto.formulario_versao WHERE publicada ORDER BY numero DESC LIMIT 1")).rows[0]?.id;
  if (!versaoId) throw new Error("Nenhuma versão publicada do formulário no banco (rode os seeds do oto-db).");

  const [pg, op, rg, it] = await Promise.all([
    db.query(
      `SELECT p.id, p.codigo, p.tipo, p.grupo_itens FROM oto.pergunta p
       JOIN oto.secao s ON s.id = p.secao_id WHERE s.formulario_versao_id = $1`,
      [versaoId]
    ),
    db.query(
      `SELECT o.id, o.pergunta_id, o.rotulo FROM oto.opcao o
       JOIN oto.pergunta p ON p.id = o.pergunta_id JOIN oto.secao s ON s.id = p.secao_id
       WHERE s.formulario_versao_id = $1 ORDER BY o.ordem`,
      [versaoId]
    ),
    db.query(
      "SELECT DISTINCT ON (pergunta_id) pergunta_id, id FROM oto.regra_validacao WHERE ativa ORDER BY pergunta_id, id"
    ),
    db.query("SELECT id, codigo, tipo FROM oto.item_avaliacao WHERE codigo IS NOT NULL"),
  ]);

  const opcoes = new Map<number, Opcao[]>();
  for (const o of op.rows) {
    const lista = opcoes.get(o.pergunta_id) ?? [];
    lista.push({ id: o.id, rotulo: o.rotulo });
    opcoes.set(o.pergunta_id, lista);
  }
  const regras = new Map<number, number>(rg.rows.map((r) => [r.pergunta_id, r.id]));
  const perguntas = new Map<string, Pergunta>();
  for (const p of pg.rows) {
    perguntas.set(p.codigo, {
      id: p.id,
      codigo: p.codigo,
      tipo: p.tipo,
      grupo: p.grupo_itens,
      opcoes: opcoes.get(p.id) ?? [],
      regraId: regras.get(p.id) ?? null,
    });
  }
  return {
    versaoId,
    perguntas,
    itens: new Map(it.rows.map((r) => [r.codigo, { id: r.id, grupo: r.tipo }])),
  };
}

export async function ingerirLote(lote: PesquisaPayload[]): Promise<ResultadoLote> {
  const resultado: ResultadoLote = { aceitas: [], duplicadas: [], rejeitadas: {} };
  const db = getMobilePool();
  const municipios = await carregarMunicipios();

  // Um lote de sincronização por (pesquisador, dispositivo)
  const grupos = new Map<string, PesquisaPayload[]>();
  for (const p of lote) {
    const chave = `${p?.pesquisador}|${p?.dispositivo}`;
    const lista = grupos.get(chave) ?? [];
    lista.push(p);
    grupos.set(chave, lista);
  }

  for (const itens of grupos.values()) {
    const { pesquisador, dispositivo } = itens[0] ?? ({} as Partial<PesquisaPayload>);
    const usuario: Usuario | undefined =
      typeof pesquisador === "string"
        ? (
            await db.query(
              `SELECT id, codigo_acesso AS codigo, local_padrao_id FROM oto.usuario
               WHERE codigo_acesso = $1 AND perfil = 'PESQUISADOR' AND ativo`,
              [pesquisador.toUpperCase().replace(/[^A-Z0-9]/g, "")]
            )
          ).rows[0]
        : undefined;

    if (!usuario || typeof dispositivo !== "string" || !UUID.test(dispositivo)) {
      const motivo = !usuario
        ? `Pesquisador '${pesquisador}' não cadastrado ou inativo`
        : "Identificador de dispositivo inválido";
      for (const p of itens) resultado.rejeitadas[String(p?.id)] = motivo;
      continue;
    }

    const loteId = await withTransaction(
      db,
      usuario.id,
      async (c) => {
        await c.query(
          "INSERT INTO oto.dispositivo (id, usuario_id, plataforma) VALUES ($1, $2, 'android') ON CONFLICT (id) DO NOTHING",
          [dispositivo, usuario.id]
        );
        const r = await c.query(
          "INSERT INTO oto.lote_sincronizacao (dispositivo_id, usuario_id, qtd_enviadas) VALUES ($1, $2, $3) RETURNING id",
          [dispositivo, usuario.id, itens.length]
        );
        return r.rows[0].id as string;
      },
      dispositivo
    );

    let aceitas = 0;
    let duplicadas = 0;
    let rejeitadas = 0;
    for (const p of itens) {
      try {
        const status = await withTransaction(
          db,
          usuario.id,
          async (c) => {
            const catalogo = await carregarCatalogo(p.versaoQuestionario);
            return gravarPesquisa(c, catalogo, municipios, p, usuario, dispositivo, loteId);
          },
          dispositivo
        );
        resultado.aceitas.push(p.id);
        if (status === "duplicada") {
          duplicadas++;
          resultado.duplicadas.push(p.id);
        } else {
          aceitas++;
        }
      } catch (e) {
        rejeitadas++;
        resultado.rejeitadas[String(p?.id)] =
          e instanceof Rejeicao ? e.message : `Erro ao gravar: ${(e as Error).message}`;
      }
    }

    const statusLote = rejeitadas === 0 ? "CONCLUIDO" : aceitas + duplicadas > 0 ? "PARCIAL" : "FALHOU";
    await withTransaction(
      db,
      usuario.id,
      async (c) => {
        await c.query(
          `UPDATE oto.lote_sincronizacao SET finalizado_em = now(), qtd_aceitas = $2, qtd_duplicadas = $3,
             qtd_rejeitadas = $4, status = $5::oto.status_lote WHERE id = $1`,
          [loteId, aceitas, duplicadas, rejeitadas, statusLote]
        );
        await c.query("UPDATE oto.dispositivo SET ultima_sincronizacao = now() WHERE id = $1", [dispositivo]);
      },
      dispositivo
    );
  }
  return resultado;
}

async function gravarPesquisa(
  c: PoolClient,
  cat: Catalogo,
  municipios: Map<string, number>,
  p: PesquisaPayload,
  usuario: Usuario,
  dispositivo: string,
  loteId: string
): Promise<"aceita" | "duplicada"> {
  if (!p || typeof p.id !== "string" || !UUID.test(p.id)) {
    throw new Rejeicao("Identificador da pesquisa inválido (esperado UUID)");
  }
  if ((await c.query("SELECT 1 FROM oto.pesquisa WHERE id = $1", [p.id])).rowCount) return "duplicada";

  const inicio = new Date(p.iniciadaEm);
  const fim = new Date(p.finalizadaEm ?? "");
  if (isNaN(+inicio) || isNaN(+fim)) throw new Rejeicao("Datas de início/fim ausentes ou inválidas");
  if (fim < inicio) throw new Rejeicao("Finalizada antes de iniciada");

  const numero = Number(p.protocolo);
  if (!Number.isInteger(numero) || numero < 0) throw new Rejeicao("Protocolo inválido");
  const protocolo = `${usuario.codigo}-${String(numero).padStart(4, "0")}`;

  const local = p.local
    ? (await c.query("SELECT id FROM oto.local_coleta WHERE nome = $1", [p.local])).rows[0]?.id
    : null;
  const respostas = (p.respostas ?? []).filter((r) => r && typeof r.chave === "string");
  const porChave = new Map(respostas.map((r) => [r.chave, r.valor]));
  const sinais = (p.sinalizacoes ?? []).filter((s) => s && cat.perguntas.has(s.chave));

  const ins = await c.query(
    `INSERT INTO oto.pesquisa (id, protocolo, numero_local, formulario_versao_id, origem, pesquisador_id, dispositivo_id,
        local_coleta_id, iniciada_em, finalizada_em, lote_sincronizacao_id, status_curadoria)
     VALUES ($1, $2, $3, $4, 'CAMPO', $5, $6, $7, $8, $9, $10, $11::oto.status_curadoria)
     ON CONFLICT DO NOTHING RETURNING id`,
    [
      p.id,
      protocolo,
      numero,
      cat.versaoId,
      usuario.id,
      dispositivo,
      local ?? usuario.local_padrao_id,
      inicio,
      fim,
      loteId,
      sinais.length ? "EM_REVISAO" : "SEM_PENDENCIA",
    ]
  );
  if (!ins.rowCount) throw new Rejeicao(`Protocolo ${protocolo} já usado por outra pesquisa`);

  const ctx = { municipios, ufResidencia: ufDeEstado(porChave.get("estado")) };
  const suspeitas = new Set(sinais.map((s) => s.chave));
  const matrizes = new Map<number, number>(); // pergunta matriz -> resposta.id

  for (const r of respostas) {
    const item = cat.itens.get(r.chave);
    if (item) {
      const matriz = cat.perguntas.get(item.grupo === "SERVICO" ? "avaliacao_servicos" : "avaliacao_atrativos");
      const conceito = conceitoDe(r.valor);
      if (!matriz || !conceito) continue;
      let respostaId = matrizes.get(matriz.id);
      if (!respostaId) {
        respostaId = (
          await c.query("INSERT INTO oto.resposta (pesquisa_id, pergunta_id) VALUES ($1, $2) RETURNING id", [
            p.id,
            matriz.id,
          ])
        ).rows[0].id as number;
        matrizes.set(matriz.id, respostaId);
      }
      await c.query(
        `INSERT INTO oto.avaliacao_item (resposta_id, item_avaliacao_id, conceito)
         VALUES ($1, $2, $3::oto.conceito_avaliacao) ON CONFLICT DO NOTHING`,
        [respostaId, item.id, conceito]
      );
      continue;
    }

    const pergunta = cat.perguntas.get(r.chave);
    if (!pergunta) continue; // chave que o formulário publicado não conhece: ignora sem derrubar a pesquisa
    const valores = converterValor(pergunta.tipo, r.valor, pergunta.opcoes, ctx);
    if (!valores.length) continue;

    const resp = await c.query(
      `INSERT INTO oto.resposta (pesquisa_id, pergunta_id, situacao) VALUES ($1, $2, $3::oto.situacao_resposta)
       ON CONFLICT (pesquisa_id, pergunta_id) DO NOTHING RETURNING id`,
      [p.id, pergunta.id, suspeitas.has(r.chave) ? "SUSPEITA" : "NORMAL"]
    );
    if (!resp.rowCount) continue;
    for (const v of valores) {
      await c.query(
        `INSERT INTO oto.resposta_valor (resposta_id, opcao_id, municipio_ibge, valor_numero, valor_data, valor_texto)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [resp.rows[0].id, v.opcaoId ?? null, v.municipioIbge ?? null, v.numero ?? null, v.data ?? null, v.texto ?? null]
      );
    }
    if (suspeitas.has(r.chave)) {
      const s = sinais.find((x) => x.chave === r.chave)!;
      await c.query(
        `INSERT INTO oto.sinalizacao (resposta_id, regra_validacao_id, motivo, valor_original, decisao_no_app)
         VALUES ($1, $2, $3, $4::jsonb, $5::oto.decisao_app)`,
        [
          resp.rows[0].id,
          pergunta.regraId,
          (s.mensagem || s.titulo || "Resposta fora do padrão").slice(0, 300),
          JSON.stringify(r.valor ?? null),
          s.status === "confirmed" ? "MANTIDA_E_SINALIZADA" : null,
        ]
      );
    }
  }
  return "aceita";
}
