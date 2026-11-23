// Divide o período do relatório em pontos de dia, semana, mês ou ano. Datas AAAA-MM-DD; o fim é exclusivo.
import type { Intervalo } from "../periodo.ts";

export type Granularidade = "dia" | "semana" | "mes" | "ano";
export interface PontoSerie extends Intervalo {
  rotulo: string;
  /** Não cobre o dia/semana/mês/ano inteiro. */
  parcial: boolean;
}

const DIA = 86_400_000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const texto = (t: number) => new Date(t).toISOString().slice(0, 10);
const somar = (d: string, n: number) => texto(ms(d) + n * DIA);
const maior = (a: string, b: string) => (a > b ? a : b);
const menor = (a: string, b: string) => (a < b ? a : b);

/** Início e fim completos do bloco que contém o dia. */
function bloco(d: string, g: Granularidade): Intervalo {
  const t = new Date(ms(d));
  const [ano, mes] = [t.getUTCFullYear(), t.getUTCMonth()];
  if (g === "dia") return { inicio: d, fim: somar(d, 1) };
  if (g === "semana") {
    const segunda = somar(d, -((t.getUTCDay() + 6) % 7));
    return { inicio: segunda, fim: somar(segunda, 7) };
  }
  if (g === "mes") return { inicio: texto(Date.UTC(ano, mes, 1)), fim: texto(Date.UTC(ano, mes + 1, 1)) };
  return { inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01` };
}

function rotulo(d: string, g: Granularidade): string {
  const [ano, mes, dia] = d.split("-");
  if (g === "ano") return ano;
  return g === "mes" ? `${MESES[Number(mes) - 1]}/${ano.slice(2)}` : `${dia}/${mes}`;
}

function dividir(inicio: string, fim: string, g: Granularidade): PontoSerie[] {
  const pontos: PontoSerie[] = [];
  for (let d = inicio; d < fim; ) {
    const b = bloco(d, g);
    const ponto = { inicio: maior(b.inicio, inicio), fim: menor(b.fim, fim) };
    pontos.push({ ...ponto, rotulo: rotulo(ponto.inicio, g), parcial: ponto.inicio > b.inicio || ponto.fim < b.fim });
    d = b.fim;
  }
  return pontos;
}

const LIMITES: Array<[Granularidade, number]> = [["dia", 16], ["semana", 16], ["mes", 24]];

export function montarSerie(
  periodo: Intervalo,
  primeira: string | null,
  ultima: string | null,
  hoje: string
): { granularidade: Granularidade; pontos: PontoSerie[] } {
  if (!primeira || !ultima) return { granularidade: "dia", pontos: [] };
  const inicio = maior(periodo.inicio, primeira);
  const fim = menor(periodo.fim, somar(maior(hoje, ultima), 1));
  const dias = (ms(fim) - ms(inicio)) / DIA;
  for (const [g, limite] of LIMITES) {
    if (g === "dia" && dias > limite) continue;
    if (g === "semana" && dias > limite * 7) continue;
    const pontos = dividir(inicio, fim, g);
    if (pontos.length <= limite) return { granularidade: g, pontos };
  }
  return { granularidade: "ano", pontos: dividir(inicio, fim, "ano") };
}
