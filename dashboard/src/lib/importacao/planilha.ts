// Leitura de .xlsx e .csv sem dependências externas. Módulo puro, testado com `node --test`.
import { inflateRawSync } from "node:zlib";

export type Celula = string | number | null;
export class ErroPlanilha extends Error {}

const MAX_DESCOMPACTADO = 60 * 1024 * 1024;
const MAX_COLUNAS = 300;
const MAX_LINHAS = 20_000;

function entradasZip(b: Buffer): Map<string, () => Buffer> {
  let fim = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (b.readUInt32LE(i) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new ErroPlanilha("O arquivo não é uma planilha .xlsx válida.");
  const saida = new Map<string, () => Buffer>();
  let p = b.readUInt32LE(fim + 16);
  for (let n = b.readUInt16LE(fim + 10); n > 0; n--) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new ErroPlanilha("Planilha corrompida.");
    const metodo = b.readUInt16LE(p + 10);
    const tamanho = b.readUInt32LE(p + 20);
    const nomeLen = b.readUInt16LE(p + 28);
    const local = b.readUInt32LE(p + 42);
    const nome = b.toString("utf8", p + 46, p + 46 + nomeLen);
    saida.set(nome, () => {
      const inicio = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
      const dados = b.subarray(inicio, inicio + tamanho);
      if (metodo === 0) return dados;
      if (metodo === 8) return inflateRawSync(dados, { maxOutputLength: MAX_DESCOMPACTADO });
      throw new ErroPlanilha("Compactação não suportada.");
    });
    p += 46 + nomeLen + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  return saida;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function semEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (tudo, e: string) => {
    if (!e.startsWith("#")) return ENTIDADES[e] ?? tudo;
    const n = e[1].toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
}
/** Junta os trechos <t> de um texto com formatação. */
const textos = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => semEntidades(m[1])).join("");

function coluna(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+$/, "")) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function lerXlsx(b: Buffer): Celula[][] {
  const zip = entradasZip(b);
  const xml = (nome: string) => zip.get(nome)?.().toString("utf8") ?? null;
  const nomes = [...zip.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  nomes.sort((a, c) => Number(/\d+/.exec(a)?.[0]) - Number(/\d+/.exec(c)?.[0]));
  const folha = nomes.length ? xml(nomes[0]) : null;
  if (folha === null) throw new ErroPlanilha("A planilha não tem nenhuma aba.");
  const compartilhados = [...(xml("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]));

  const linhas: Celula[][] = [];
  for (const l of folha.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const indice = Number(/\br="(\d+)"/.exec(l[1])?.[1] ?? linhas.length + 1) - 1;
    if (indice >= MAX_LINHAS) throw new ErroPlanilha(`A planilha passa de ${MAX_LINHAS} linhas.`);
    const linha: Celula[] = [];
    for (const c of (l[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1];
      const i = ref ? coluna(ref) : linha.length;
      if (i >= MAX_COLUNAS) continue;
      const tipo = /\bt="(\w+)"/.exec(c[1])?.[1] ?? "n";
      const v = /<v(?:\s[^>]*)?>([^<]*)<\/v>/.exec(c[2] ?? "")?.[1];
      if (tipo === "inlineStr") linha[i] = textos(c[2] ?? "");
      else if (v === undefined) linha[i] = null;
      else if (tipo === "s") linha[i] = compartilhados[Number(v)] ?? null;
      else if (tipo === "n") linha[i] = Number.isFinite(Number(v)) ? Number(v) : semEntidades(v);
      else linha[i] = semEntidades(v);
    }
    linhas[indice] = Array.from(linha, (x) => x ?? null);
  }
  return Array.from(linhas, (l) => l ?? []);
}

function lerCsv(texto: string): Celula[][] {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split("\n", 1)[0];
  const contar = (s: string) => primeira.split(s).length;
  const sep = ["\t", ","].reduce((a, c) => (contar(c) > contar(a) ? c : a), ";");
  const linhas: Celula[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  const fecharLinha = () => {
    linha.push(campo);
    linhas.push(linha.slice(0, MAX_COLUNAS));
    if (linhas.length > MAX_LINHAS) throw new ErroPlanilha(`A planilha passa de ${MAX_LINHAS} linhas.`);
    linha = [];
    campo = "";
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c !== '"') campo += c;
      else if (t[i + 1] === '"') {
        campo += '"';
        i++;
      } else aspas = false;
    } else if (c === '"' && campo === "") aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") fecharLinha();
    else if (c !== "\r") campo += c;
  }
  if (campo !== "" || linha.length) fecharLinha();
  return linhas;
}

export function lerPlanilha(b: Buffer): Celula[][] {
  if (b.length === 0) throw new ErroPlanilha("O arquivo está vazio.");
  try {
    if (b.length > 4 && b.readUInt32LE(0) === 0x04034b50) return lerXlsx(b);
    if (b.length > 4 && b.readUInt32LE(0) === 0xe011cfd0) throw new ErroPlanilha("Formato .xls antigo: salve como .xlsx.");
    // CSV do Excel em português costuma vir em windows-1252.
    let texto: string;
    try {
      texto = new TextDecoder("utf-8", { fatal: true }).decode(b);
    } catch {
      texto = new TextDecoder("windows-1252").decode(b);
    }
    if (texto.includes("\0")) throw new ErroPlanilha("Use um arquivo .xlsx ou .csv.");
    return lerCsv(texto);
  } catch (e) {
    if (e instanceof ErroPlanilha) throw e;
    throw new ErroPlanilha("Não foi possível ler o arquivo. Ele pode estar corrompido.");
  }
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** Data em ISO a partir de número de série do Excel, dd/mm/aaaa ou aaaa-mm-dd. null = não é data. */
export function paraIso(v: Celula): string | null {
  if (typeof v === "number") {
    if (v < 20_000 || v > 80_000) return null; // 1954 a 2119
    return new Date(Math.round((v - 25_569) * 86_400) * 1000).toISOString().slice(0, 10);
  }
  const t = String(v ?? "").trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  const iso = br ? `${br[3]}-${doisDigitos(Number(br[2]))}-${doisDigitos(Number(br[1]))}` : t.slice(0, 10);
  const d = new Date(`${iso}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(+d) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
