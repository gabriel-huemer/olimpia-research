// Versões do formulário (RF05): rascunho editável, publicação e histórico. Versão publicada nunca muda.
import type { PoolClient } from "pg";
import { getDbPool, withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";
import layout from "./layout-app.json";

export const TIPOS_NOVOS = ["UNICA_ESCOLHA", "MULTIPLA_ESCOLHA", "NUMERO", "MOEDA", "ESCALA_0_10", "DATA", "TEXTO"] as const;

export interface VersaoResumo {
  id: string;
  numero: number;
  status: "ATIVA" | "ENCERRADA" | "RASCUNHO";
  respostas: number;
  vigenteDe: string | null;
  perguntas: number;
}
export interface Condicao {
  key: string;
  values: string[];
}
export interface PerguntaEdicao {
  id: string;
  codigo: string;
  enunciado: string;
  tipo: string;
  opcoes: string[];
  min: number | null;
  max: number | null;
  condicao: Condicao | null;
  /** Pergunta do formulário original: não pode ser removida nem trocar de tipo (RN12). */
  original: boolean;
}
export interface SecaoEdicao {
  id: string;
  ordem: number;
  titulo: string;
  perguntas: PerguntaEdicao[];
}
export interface VersaoCompleta extends VersaoResumo {
  nome: string;
  secoes: SecaoEdicao[];
}

const FORM = "(SELECT id FROM oto.formulario WHERE ativo ORDER BY id LIMIT 1)";
const ORIGINAIS = new Set<string>([...layout.questions.map((q) => q.key), "avaliacao_servicos", "avaliacao_atrativos"]);
const CONDICOES = new Map<string, unknown>(layout.questions.flatMap((q) => ("dependsOn" in q ? [[q.key, q.dependsOn] as const] : [])));
const NUMERICOS = new Set(["NUMERO", "MOEDA"]);
const MAX_PERGUNTAS = 120;

const SELECT_VERSAO = `
  SELECT v.id::text AS id, v.numero, v.publicada, to_char(v.vigente_de, 'DD/MM/YYYY') AS de, f.nome,
         (SELECT count(*)::int FROM oto.pesquisa p WHERE p.formulario_versao_id = v.id) AS respostas,
         (SELECT count(*)::int FROM oto.pergunta pg JOIN oto.secao s ON s.id = pg.secao_id WHERE s.formulario_versao_id = v.id) AS perguntas,
         v.numero = (SELECT max(x.numero) FROM oto.formulario_versao x WHERE x.formulario_id = v.formulario_id AND x.publicada) AS atual
    FROM oto.formulario_versao v JOIN oto.formulario f ON f.id = v.formulario_id
   WHERE v.formulario_id = ${FORM}`;

interface LinhaVersao {
  id: string;
  numero: number;
  publicada: boolean;
  de: string | null;
  nome: string;
  respostas: number;
  perguntas: number;
  atual: boolean;
}
const resumo = (l: LinhaVersao): VersaoResumo => ({
  id: l.id,
  numero: l.numero,
  status: !l.publicada ? "RASCUNHO" : l.atual ? "ATIVA" : "ENCERRADA",
  respostas: l.respostas,
  vigenteDe: l.publicada ? l.de : null,
  perguntas: l.perguntas,
});

export async function listarVersoes(): Promise<VersaoResumo[]> {
  return (await getDbPool().query<LinhaVersao>(`${SELECT_VERSAO} ORDER BY v.numero DESC`)).rows.map(resumo);
}

const idValido = (id: unknown) => {
  const t = String(id ?? "");
  if (!/^\d{1,18}$/.test(t)) throw new ErroAdmin(404, "Não encontrado.");
  return t;
};

export async function verVersao(id: string): Promise<VersaoCompleta> {
  const db = getDbPool();
  const v = (await db.query<LinhaVersao>(`${SELECT_VERSAO} AND v.id = $1`, [idValido(id)])).rows[0];
  if (!v) throw new ErroAdmin(404, "Versão não encontrada.");
  const [secoes, perguntas] = await Promise.all([
    db.query("SELECT id::text AS id, ordem, titulo FROM oto.secao WHERE formulario_versao_id = $1 ORDER BY ordem", [id]),
    db.query(
      `SELECT pg.id::text AS id, pg.secao_id::text AS secao, pg.codigo, pg.enunciado, pg.tipo, pg.config->'dependsOn' AS condicao,
              (SELECT coalesce(json_agg(o.rotulo ORDER BY o.ordem), '[]') FROM oto.opcao o WHERE o.pergunta_id = pg.id) AS opcoes,
              (SELECT rv.parametros FROM oto.regra_validacao rv WHERE rv.pergunta_id = pg.id AND rv.ativa ORDER BY rv.id LIMIT 1) AS faixa
         FROM oto.pergunta pg JOIN oto.secao s ON s.id = pg.secao_id WHERE s.formulario_versao_id = $1 ORDER BY pg.ordem`,
      [id]
    ),
  ]);
  return {
    ...resumo(v),
    nome: v.nome,
    secoes: secoes.rows.map((s) => ({
      ...s,
      perguntas: perguntas.rows
        .filter((p) => p.secao === s.id)
        .map((p) => ({
          id: p.id, codigo: p.codigo, enunciado: p.enunciado, tipo: p.tipo, opcoes: p.opcoes,
          min: p.faixa?.min ?? null, max: p.faixa?.max ?? null, condicao: p.condicao ?? (CONDICOES.get(p.codigo) as Condicao | undefined) ?? null, original: ORIGINAIS.has(p.codigo),
        })),
    })),
  };
}

// ---------------------------------------------------------------- edição do rascunho

const texto = (v: unknown, max: number, nome: string): string => {
  const t = typeof v === "string" ? v.replace(/[\0\s]+/g, " ").trim() : "";
  if (!t || t.length > max) throw new ErroAdmin(400, `${nome}: use de 1 a ${max} caracteres.`);
  return t;
};
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_)|(_$)/g, "").slice(0, 50);

const limite = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new ErroAdmin(400, "Limite do alerta inválido.");
  return n;
};

async function rascunho(c: PoolClient): Promise<string> {
  const r = await c.query(
    `SELECT id::text AS id FROM oto.formulario_versao WHERE formulario_id = ${FORM} AND NOT publicada ORDER BY numero DESC LIMIT 1 FOR UPDATE`
  );
  if (!r.rowCount) throw new ErroAdmin(409, "Não há rascunho. Crie um para editar.");
  return r.rows[0].id;
}

async function criarRascunho(c: PoolClient): Promise<string> {
  await c.query(`SELECT 1 FROM oto.formulario WHERE id = ${FORM} FOR UPDATE`);
  const aberto = await c.query(`SELECT 1 FROM oto.formulario_versao WHERE formulario_id = ${FORM} AND NOT publicada`);
  if (aberto.rowCount) throw new ErroAdmin(409, "Já existe um rascunho.");
  const base = (
    await c.query(`SELECT id, formulario_id FROM oto.formulario_versao WHERE formulario_id = ${FORM} AND publicada ORDER BY numero DESC LIMIT 1`)
  ).rows[0];
  if (!base) throw new ErroAdmin(409, "Nenhuma versão publicada para copiar.");
  const nova = (
    await c.query(
      `INSERT INTO oto.formulario_versao (formulario_id, numero, publicada)
       SELECT $1, max(numero) + 1, false FROM oto.formulario_versao WHERE formulario_id = $1 RETURNING id::text AS id`,
      [base.formulario_id]
    )
  ).rows[0].id;
  const p = [base.id, nova];
  await c.query(
    "INSERT INTO oto.secao (formulario_versao_id, ordem, titulo, subtitulo) SELECT $2::bigint, ordem, titulo, subtitulo FROM oto.secao WHERE formulario_versao_id = $1",
    p
  );
  await c.query(
    `INSERT INTO oto.pergunta (secao_id, ordem, codigo, enunciado, ajuda, tipo, obrigatoria, grupo_itens, config)
     SELECT ns.id, pg.ordem, pg.codigo, pg.enunciado, pg.ajuda, pg.tipo, pg.obrigatoria, pg.grupo_itens, pg.config
       FROM oto.pergunta pg JOIN oto.secao s ON s.id = pg.secao_id AND s.formulario_versao_id = $1
       JOIN oto.secao ns ON ns.formulario_versao_id = $2 AND ns.ordem = s.ordem`,
    p
  );
  const pares = `FROM oto.pergunta pg JOIN oto.secao s ON s.id = pg.secao_id AND s.formulario_versao_id = $1
       JOIN oto.secao ns ON ns.formulario_versao_id = $2 JOIN oto.pergunta np ON np.secao_id = ns.id AND np.codigo = pg.codigo`;
  await c.query(`INSERT INTO oto.opcao (pergunta_id, ordem, rotulo, valor) SELECT np.id, o.ordem, o.rotulo, o.valor ${pares} JOIN oto.opcao o ON o.pergunta_id = pg.id`, p);
  await c.query(
    `INSERT INTO oto.regra_validacao (pergunta_id, tipo, parametros, mensagem, ativa)
     SELECT np.id, rv.tipo, rv.parametros, rv.mensagem, rv.ativa ${pares} JOIN oto.regra_validacao rv ON rv.pergunta_id = pg.id`,
    p
  );
  return nova;
}

async function adicionarSecao(c: PoolClient, d: Record<string, unknown>) {
  const v = await rascunho(c);
  await c.query(
    `INSERT INTO oto.secao (formulario_versao_id, ordem, titulo)
     SELECT $1, coalesce(max(ordem), 0) + 1, $2 FROM oto.secao WHERE formulario_versao_id = $1`,
    [v, texto(d.titulo, 120, "Título")]
  );
}

async function removerSecao(c: PoolClient, d: Record<string, unknown>) {
  const v = await rascunho(c);
  // Só a última seção vazia, para a numeração não ficar com buracos.
  const r = await c.query(
    `DELETE FROM oto.secao s WHERE s.id = $1 AND s.formulario_versao_id = $2
        AND s.ordem = (SELECT max(ordem) FROM oto.secao WHERE formulario_versao_id = $2)
        AND NOT EXISTS (SELECT 1 FROM oto.pergunta p WHERE p.secao_id = s.id)`,
    [idValido(d.secaoId), v]
  );
  if (!r.rowCount) throw new ErroAdmin(409, "Só a última seção, e vazia, pode ser removida.");
}

async function perguntaDoRascunho(c: PoolClient, id: unknown) {
  const v = await rascunho(c);
  const r = await c.query(
    `SELECT p.id::text AS id, p.codigo, p.tipo, s.ordem AS secao_ordem FROM oto.pergunta p JOIN oto.secao s ON s.id = p.secao_id
      WHERE p.id = $1 AND s.formulario_versao_id = $2`,
    [idValido(id), v]
  );
  if (!r.rowCount) throw new ErroAdmin(404, "Pergunta não encontrada no rascunho.");
  return { versao: v, ...r.rows[0] } as { versao: string; id: string; codigo: string; tipo: string; secao_ordem: number };
}

async function gravarOpcoes(c: PoolClient, perguntaId: string, rotulos: unknown) {
  if (rotulos === undefined) return;
  if (!Array.isArray(rotulos) || rotulos.length > 60) throw new ErroAdmin(400, "Opções inválidas.");
  for (const bruto of rotulos) {
    const rotulo = texto(bruto, 150, "Opção");
    const valor = slug(rotulo) || "opcao";
    const r = await c.query(
      `INSERT INTO oto.opcao (pergunta_id, ordem, rotulo, valor)
       SELECT $1, coalesce(max(ordem), 0) + 1, $2, $3 FROM oto.opcao WHERE pergunta_id = $1
       ON CONFLICT DO NOTHING RETURNING id`,
      [perguntaId, rotulo, valor]
    );
    if (!r.rowCount) throw new ErroAdmin(409, `Opção repetida: ${rotulo}`);
  }
}

async function gravarFaixa(c: PoolClient, perguntaId: string, tipo: string, d: Record<string, unknown>) {
  if (d.min === undefined && d.max === undefined) return;
  if (!NUMERICOS.has(tipo)) throw new ErroAdmin(400, "Alerta de faixa só vale para número e moeda.");
  const [min, max] = [limite(d.min), limite(d.max)];
  if (min !== null && max !== null && min > max) throw new ErroAdmin(400, "O mínimo do alerta passa do máximo.");
  await c.query("DELETE FROM oto.regra_validacao WHERE pergunta_id = $1", [perguntaId]);
  if (min !== null || max !== null) {
    await c.query(
      "INSERT INTO oto.regra_validacao (pergunta_id, tipo, parametros, mensagem) VALUES ($1, 'FAIXA_NUMERICA', $2::jsonb, 'Valor fora do esperado')",
      [perguntaId, JSON.stringify({ min, max })]
    );
  }
}

async function condicaoValida(c: PoolClient, versao: string, secaoOrdem: number, bruta: unknown): Promise<Condicao | null> {
  if (bruta === null || bruta === undefined) return null;
  const { key, values } = bruta as Partial<Condicao>;
  if (typeof key !== "string" || !Array.isArray(values) || !values.length) throw new ErroAdmin(400, "Condição inválida.");
  const r = await c.query(
    `SELECT array_agg(o.rotulo) AS opcoes FROM oto.pergunta p JOIN oto.secao s ON s.id = p.secao_id JOIN oto.opcao o ON o.pergunta_id = p.id
      WHERE s.formulario_versao_id = $1 AND p.codigo = $2 AND s.ordem <= $3`,
    [versao, key, secaoOrdem]
  );
  const opcoes: string[] = r.rows[0]?.opcoes ?? [];
  if (!values.every((x) => opcoes.includes(x))) {
    throw new ErroAdmin(400, "A condição precisa de uma pergunta de escolha anterior e de uma opção dela.");
  }
  return { key, values };
}

async function adicionarPergunta(c: PoolClient, d: Record<string, unknown>) {
  const v = await rascunho(c);
  const tipo = String(d.tipo ?? "");
  if (!(TIPOS_NOVOS as readonly string[]).includes(tipo)) throw new ErroAdmin(400, "Tipo de pergunta inválido.");
  const enunciado = texto(d.enunciado, 300, "Enunciado");
  const secao = (
    await c.query(
      `SELECT s.id, s.ordem, (SELECT count(*) FROM oto.pergunta p WHERE p.secao_id = s.id AND p.tipo = 'MATRIZ_AVALIACAO')::int AS matriz
         FROM oto.secao s WHERE s.id = $1 AND s.formulario_versao_id = $2`,
      [idValido(d.secaoId), v]
    )
  ).rows[0];
  if (!secao) throw new ErroAdmin(404, "Seção não encontrada no rascunho.");
  if (secao.matriz) throw new ErroAdmin(409, "A seção de avaliação por itens não aceita outras perguntas.");
  const escolha = tipo === "UNICA_ESCOLHA" || tipo === "MULTIPLA_ESCOLHA";
  if (escolha && (!Array.isArray(d.opcoes) || d.opcoes.length < 2)) throw new ErroAdmin(400, "Informe pelo menos duas opções.");
  if (!escolha && Array.isArray(d.opcoes) && d.opcoes.length) throw new ErroAdmin(400, "Este tipo não tem opções.");
  const usados = new Set(
    (await c.query("SELECT p.codigo FROM oto.pergunta p JOIN oto.secao s ON s.id = p.secao_id WHERE s.formulario_versao_id = $1", [v])).rows.map((l) => l.codigo)
  );
  if (usados.size >= MAX_PERGUNTAS) throw new ErroAdmin(409, `O limite é de ${MAX_PERGUNTAS} perguntas.`);
  // O código não pode ter existido com outro tipo: as análises juntam as versões pelo código.
  const outros = new Set(
    (await c.query("SELECT DISTINCT codigo FROM oto.pergunta WHERE tipo <> $1::oto.tipo_pergunta", [tipo])).rows.map((l) => l.codigo)
  );
  const base = slug(enunciado) || "pergunta";
  let codigo = base;
  for (let i = 2; usados.has(codigo) || outros.has(codigo) || ORIGINAIS.has(codigo); i++) codigo = `${base}_${i}`;
  const condicao = await condicaoValida(c, v, secao.ordem, d.condicao);
  const id = (
    await c.query(
      `INSERT INTO oto.pergunta (secao_id, ordem, codigo, enunciado, tipo, obrigatoria, config)
       SELECT $1, coalesce(max(ordem), 0) + 1, $2, $3, $4::oto.tipo_pergunta, false, $5::jsonb FROM oto.pergunta WHERE secao_id = $1
       RETURNING id::text AS id`,
      [secao.id, codigo, enunciado, tipo, JSON.stringify(condicao ? { dependsOn: condicao } : {})]
    )
  ).rows[0].id;
  await gravarOpcoes(c, id, escolha ? d.opcoes : undefined);
  await gravarFaixa(c, id, tipo, d);
}

async function editarPergunta(c: PoolClient, d: Record<string, unknown>) {
  const p = await perguntaDoRascunho(c, d.perguntaId);
  if (d.enunciado !== undefined) {
    await c.query("UPDATE oto.pergunta SET enunciado = $2 WHERE id = $1", [p.id, texto(d.enunciado, 300, "Enunciado")]);
  }
  if (Array.isArray(d.novasOpcoes) && d.novasOpcoes.length) {
    if (p.tipo !== "UNICA_ESCOLHA" && p.tipo !== "MULTIPLA_ESCOLHA") throw new ErroAdmin(400, "Este tipo não tem opções.");
    if (p.codigo === "estado") throw new ErroAdmin(409, "A lista de estados é fixa.");
    await gravarOpcoes(c, p.id, d.novasOpcoes);
  }
  await gravarFaixa(c, p.id, p.tipo, d);
}

async function removerPergunta(c: PoolClient, d: Record<string, unknown>) {
  const p = await perguntaDoRascunho(c, d.perguntaId);
  if (ORIGINAIS.has(p.codigo)) throw new ErroAdmin(409, "As perguntas do formulário original não podem ser removidas (RN12).");
  const usada = await c.query(
    `SELECT 1 FROM oto.pergunta x JOIN oto.secao s ON s.id = x.secao_id WHERE s.formulario_versao_id = $1 AND x.config->'dependsOn'->>'key' = $2`,
    [p.versao, p.codigo]
  );
  if (usada.rowCount) throw new ErroAdmin(409, "Outra pergunta depende desta.");
  for (const t of ["opcao", "regra_validacao"]) await c.query(`DELETE FROM oto.${t} WHERE pergunta_id = $1`, [p.id]);
  await c.query("DELETE FROM oto.pergunta WHERE id = $1", [p.id]);
}

async function publicar(c: PoolClient) {
  const v = await rascunho(c);
  const vazia = await c.query(
    "SELECT titulo FROM oto.secao s WHERE formulario_versao_id = $1 AND NOT EXISTS (SELECT 1 FROM oto.pergunta p WHERE p.secao_id = s.id)",
    [v]
  );
  if (vazia.rowCount) throw new ErroAdmin(409, `A seção "${vazia.rows[0].titulo}" está vazia.`);
  const hoje = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";
  // As anteriores continuam "publicada": aparelhos sem internet ainda enviam respostas delas.
  await c.query(
    `UPDATE oto.formulario_versao SET vigente_ate = ${hoje} WHERE formulario_id = ${FORM} AND publicada AND vigente_ate IS NULL`
  );
  await c.query(`UPDATE oto.formulario_versao SET publicada = true, vigente_de = ${hoje} WHERE id = $1`, [v]);
}

const ACOES: Record<string, (c: PoolClient, d: Record<string, unknown>) => Promise<unknown>> = {
  criarRascunho, adicionarSecao, removerSecao, adicionarPergunta, editarPergunta, removerPergunta, publicar,
};

export async function executarAcao(autorId: string, dados: Record<string, unknown>): Promise<VersaoResumo[]> {
  const nome = String(dados.acao ?? "");
  if (!Object.hasOwn(ACOES, nome)) throw new ErroAdmin(400, "Ação desconhecida.");
  await withAuditTransaction(autorId, (c) => ACOES[nome](c, dados));
  return listarVersoes();
}
