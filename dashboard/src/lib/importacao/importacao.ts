// Importação de planilhas históricas (RF09): prévia sem gravar e gravação em uma transação só.
import { createHash, randomUUID } from "node:crypto";
import { getDbPool, withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";
import { carregarCatalogo, carregarMunicipios, gravarRespostas, type Catalogo } from "@/lib/ingestao/ingestao";
import { norm } from "@/lib/ingestao/conversao";
import { conferir, type Resposta } from "@/lib/pesquisas/manual";
import cabecalhos from "./cabecalhos.json";
import { mapear, type Alvo, type Mapeamento } from "./mapeamento";
import { ErroPlanilha, lerPlanilha, paraIso, type Celula } from "./planilha";

export interface ErroLinha {
  linha: number;
  motivo: string;
}
export interface Previa {
  arquivo: string;
  total: number;
  validas: number;
  duplicadas: number;
  alertas: number;
  erros: ErroLinha[];
  totalErros: number;
  reconhecidas: number;
  ignoradas: string[];
}
export interface ImportacaoFeita extends Previa {
  id: string;
}
export interface ImportacaoLinha {
  id: string;
  arquivo: string;
  usuario: string;
  quando: string;
  total: number;
  importadas: number;
  duplicadas: number;
  erros: number;
}

interface Linha {
  numero: number;
  dia: string;
  local: string | null;
  respostas: Resposta[];
  alertas: Array<{ chave: string; mensagem: string }>;
  hash: string;
}

const MAX_LINHAS = 3000;
const MAX_ERROS_TELA = 100;
const CABECALHOS = cabecalhos as Record<string, { coluna: number | null; titulo: string | null }>;

async function alvosDe(cat: Catalogo): Promise<Alvo[]> {
  const itens = (await getDbPool().query("SELECT codigo, nome FROM oto.item_avaliacao WHERE codigo IS NOT NULL")).rows;
  const doSeed = (chave: string) => CABECALHOS[chave] ?? { coluna: null, titulo: null };
  const alvo = (chave: string, nome: string): Alvo => ({
    chave,
    titulos: [doSeed(chave).titulo ?? "", nome],
    coluna: doSeed(chave).coluna,
  });
  return [
    ...[...cat.perguntas.values()].filter((p) => p.tipo !== "MATRIZ_AVALIACAO").map((p) => alvo(p.codigo, p.enunciado)),
    ...itens.map((i) => ({ ...alvo(i.codigo, i.nome), modelo: `Avaliação [${i.nome}]` })),
  ];
}

function valorDaCelula(cat: Catalogo, chave: string, c: Celula): string | number | null {
  if (c === null || c === "") return null;
  const tipo = cat.perguntas.get(chave)?.tipo;
  if (tipo === "DATA") return paraIso(c) ?? String(c);
  const texto = String(c).trim();
  // "1.234" em CSV brasileiro é mil e duzentos, não um vírgula dois.
  if (typeof c === "string" && tipo === "MOEDA") {
    const semCifrao = texto.replace(/^R\$\s*/i, "");
    return /^\d{1,3}(\.\d{3})+$/.test(semCifrao) ? semCifrao.replaceAll(".", "") : semCifrao;
  }
  return typeof c === "number" && tipo !== "TEXTO" ? c : texto;
}

interface Leitura {
  cat: Catalogo;
  municipios: Map<string, number>;
  mapa: Mapeamento;
  linhas: Linha[];
  previa: Previa;
  arquivoHash: string;
  errosCompletos: ErroLinha[];
}

async function ler(arquivo: string, bytes: Buffer): Promise<Leitura> {
  let grade: Celula[][];
  try {
    grade = lerPlanilha(bytes);
  } catch (e) {
    if (e instanceof ErroPlanilha) throw new ErroAdmin(400, e.message);
    throw e;
  }
  const [cat, municipios] = [await carregarCatalogo(undefined), await carregarMunicipios()];
  const mapa = mapear(grade, await alvosDe(cat));
  if (!mapa) throw new ErroAdmin(400, "Não reconheci as colunas. Use a planilha de tabulação ou o modelo desta tela.");
  const dados = grade
    .map((celulas, i) => ({ celulas, numero: i + 1 }))
    .slice(mapa.linhaCabecalho + 1)
    .filter((l) => l.celulas.some((c) => c !== null && String(c).trim() !== ""));
  if (!dados.length) throw new ErroAdmin(400, "A planilha não tem nenhuma linha de resposta.");
  if (dados.length > MAX_LINHAS) throw new ErroAdmin(400, `Divida o arquivo: o limite é de ${MAX_LINHAS} linhas por vez.`);

  const colunaData = mapa.colunaData ?? mapa.chaves.indexOf("data_chegada");
  if (colunaData < 0) throw new ErroAdmin(400, 'Falta a coluna com a data ("Data da pesquisa" ou "Data de chegada").');
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  const erros: ErroLinha[] = [];
  const candidatas: Linha[] = [];
  for (const { celulas, numero } of dados) {
    const dia = paraIso(celulas[colunaData] ?? null);
    if (!dia || dia < "2000-01-01" || dia > hoje) {
      erros.push({ linha: numero, motivo: "Data da pesquisa ausente ou inválida" });
      continue;
    }
    const respostas: Resposta[] = [];
    mapa.chaves.forEach((chave, i) => {
      const valor = chave ? valorDaCelula(cat, chave, celulas[i] ?? null) : null;
      if (chave && valor !== null && valor !== "") respostas.push({ chave, valor });
    });
    const { problemas, alertas } = conferir(cat, municipios, respostas);
    if (!respostas.length) problemas.push("Linha sem respostas");
    if (problemas.length) {
      erros.push({ linha: numero, motivo: problemas.join(" · ").slice(0, 500) });
      continue;
    }
    const local = mapa.colunaLocal === null ? null : String(celulas[mapa.colunaLocal] ?? "").trim() || null;
    // Inclui a célula bruta da data (com hora): dois turistas iguais no mesmo dia não são duplicata.
    const base = JSON.stringify([celulas[colunaData], local, respostas.map((r) => [r.chave, norm(r.valor)]).sort()]);
    candidatas.push({ numero, dia, local, respostas, alertas, hash: createHash("sha256").update(base).digest("hex") });
  }
  const jaGravadas = new Set(
    (await getDbPool().query("SELECT hash_dedup FROM oto.pesquisa WHERE hash_dedup = ANY($1)", [candidatas.map((l) => l.hash)])).rows.map(
      (l) => l.hash_dedup
    )
  );
  const linhas: Linha[] = [];
  for (const l of candidatas) {
    if (jaGravadas.has(l.hash)) continue;
    jaGravadas.add(l.hash);
    linhas.push(l);
  }
  return {
    cat,
    municipios,
    mapa,
    linhas,
    errosCompletos: erros,
    arquivoHash: createHash("sha256").update(bytes).digest("hex"),
    previa: {
      arquivo,
      total: dados.length,
      validas: linhas.length,
      duplicadas: candidatas.length - linhas.length,
      alertas: linhas.filter((l) => l.alertas.length).length,
      erros: erros.slice(0, MAX_ERROS_TELA),
      totalErros: erros.length,
      reconhecidas: mapa.chaves.filter(Boolean).length,
      ignoradas: mapa.ignoradas.slice(0, 30),
    },
  };
}

export async function preverImportacao(arquivo: string, bytes: Buffer): Promise<Previa> {
  return (await ler(arquivo, bytes)).previa;
}

export async function importar(autorId: string, arquivo: string, bytes: Buffer): Promise<ImportacaoFeita> {
  const l = await ler(arquivo, bytes);
  if (!l.linhas.length) throw new ErroAdmin(400, "Nenhuma linha nova para importar.");
  return withAuditTransaction(autorId, async (c) => {
    // Uma importação por vez: evita gravar a mesma linha duas vezes a partir de dois arquivos.
    await c.query("SELECT pg_advisory_xact_lock(hashtext('oto.importacao'))");
    const repetidas = await c.query("SELECT 1 FROM oto.pesquisa WHERE hash_dedup = ANY($1) LIMIT 1", [l.linhas.map((x) => x.hash)]);
    if (repetidas.rowCount) throw new ErroAdmin(409, "Outra importação acabou de gravar parte destas linhas. Confira de novo.");
    const nova = await c.query(
      `INSERT INTO oto.importacao (usuario_id, arquivo_nome, arquivo_hash, formulario_versao_id, finalizada_em, total_linhas,
                                   linhas_importadas, linhas_duplicadas, linhas_com_erro, status)
       VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9::oto.status_importacao)
       ON CONFLICT (arquivo_hash) DO NOTHING RETURNING id`,
      [
        autorId, arquivo, l.arquivoHash, l.cat.versaoId, l.previa.total, l.linhas.length, l.previa.duplicadas,
        l.errosCompletos.length, l.errosCompletos.length ? "CONCLUIDA_COM_ERROS" : "CONCLUIDA",
      ]
    );
    if (!nova.rowCount) throw new ErroAdmin(409, "Este arquivo já foi importado.");
    const id: string = nova.rows[0].id;
    for (const e of l.errosCompletos) {
      await c.query("INSERT INTO oto.importacao_erro (importacao_id, linha, motivo) VALUES ($1, $2, $3)", [id, e.linha, e.motivo]);
    }
    const locais = new Map<string, string>(
      (await c.query("SELECT id, nome FROM oto.local_coleta")).rows.map((x) => [norm(x.nome), x.id])
    );
    for (const linha of l.linhas) {
      const pesquisaId = randomUUID();
      const momento = new Date(`${linha.dia}T12:00:00-03:00`);
      await c.query(
        `INSERT INTO oto.pesquisa (id, protocolo, formulario_versao_id, origem, importacao_id, registrada_por, local_coleta_id,
                                   iniciada_em, finalizada_em, hash_dedup, status_curadoria)
         VALUES ($1, 'IMP-' || lpad(nextval('oto.seq_protocolo_importacao')::text, 6, '0'), $2, 'IMPORTACAO', $3, $4, $5, $6, $6, $7,
                 $8::oto.status_curadoria)`,
        [
          pesquisaId, l.cat.versaoId, id, autorId, locais.get(norm(linha.local)) ?? null, momento, linha.hash,
          linha.alertas.length ? "EM_REVISAO" : "SEM_PENDENCIA",
        ]
      );
      await gravarRespostas(c, l.cat, l.municipios, pesquisaId, linha.respostas, linha.alertas);
    }
    return { id, ...l.previa };
  });
}

export async function listarImportacoes(): Promise<ImportacaoLinha[]> {
  const { rows } = await getDbPool().query(
    `SELECT i.id, i.arquivo_nome AS arquivo, u.nome AS usuario, i.total_linhas AS total, i.linhas_importadas AS importadas,
            i.linhas_duplicadas AS duplicadas, i.linhas_com_erro AS erros,
            to_char(i.iniciada_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS quando
       FROM oto.importacao i JOIN oto.usuario u ON u.id = i.usuario_id ORDER BY i.iniciada_em DESC LIMIT 50`
  );
  return rows;
}

/** Títulos do modelo de planilha, com uma linha de exemplo da data. */
export async function modelo(): Promise<string[]> {
  const alvos = await alvosDe(await carregarCatalogo(undefined));
  return ["Data da pesquisa", "Local", ...alvos.map((a) => a.modelo ?? a.titulos[1])];
}
