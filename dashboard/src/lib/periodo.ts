// Período das Análises. Valores: "Mês atual", "Últimos 7/30 dias", "2026-03", "Ano 2026" ou "2026-03-10..2026-03-15".
// Datas em AAAA-MM-DD no fuso de São Paulo; o fim do intervalo é exclusivo.

export interface Intervalo {
  inicio: string;
  fim: string;
}
export interface Periodo extends Intervalo {
  tipo: "mes" | "ano" | "dias";
}

const NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MES = /^(20\d{2})-(0[1-9]|1[0-2])$/;
export const ANO = /^Ano (20\d{2})$/;
export const PERSONALIZADO = /^(20\d{2}-\d{2}-\d{2})\.\.(20\d{2}-\d{2}-\d{2})$/;

const DIA = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const texto = (t: number) => new Date(t).toISOString().slice(0, 10);
const somarDias = (d: string, n: number) => texto(ms(d) + n * DIA);
const diaValido = (d: string) => !Number.isNaN(ms(d)) && texto(ms(d)) === d;
const menor = (a: string, b: string) => (a < b ? a : b);
/** Primeiro dia do mês (mes pode passar de 1 a 12: o ano acompanha). */
const primeiroDia = (ano: number, mes: number) => texto(Date.UTC(ano, mes - 1, 1));

export const hojeLocal = (agora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);

const intervaloMes = (ano: number, mes: number): Periodo => ({
  tipo: "mes", inicio: primeiroDia(ano, mes), fim: primeiroDia(ano, mes + 1),
});
export const intervaloAno = (ano: number): Periodo => ({ tipo: "ano", inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01` });

export function resolverPeriodo(valor: string | undefined, hoje: string): Periodo {
  const v = valor ?? "";
  const atual = MES.exec(v === "Mês atual" ? hoje.slice(0, 7) : v);
  if (atual) return intervaloMes(Number(atual[1]), Number(atual[2]));
  const dias = /^Últimos (7|30) dias$/.exec(v);
  if (dias) return { tipo: "dias", inicio: somarDias(hoje, 1 - Number(dias[1])), fim: somarDias(hoje, 1) };
  const c = PERSONALIZADO.exec(v);
  if (c && diaValido(c[1]) && diaValido(c[2])) {
    const [de, ate] = c[1] <= c[2] ? [c[1], c[2]] : [c[2], c[1]];
    return { tipo: "dias", inicio: de, fim: somarDias(ate, 1) };
  }
  const a = ANO.exec(v);
  return intervaloAno(Number(a ? a[1] : hoje.slice(0, 4)));
}

/** Intervalo equivalente anterior. Se o período ainda está em andamento, compara só até o mesmo dia. */
export function comparacao(p: Periodo, hoje: string): Intervalo & { nome: string } {
  const [ano, mes] = p.inicio.split("-").map(Number);
  if (p.tipo === "dias") {
    const dias = Math.round((ms(p.fim) - ms(p.inicio)) / DIA);
    return { inicio: somarDias(p.inicio, -dias), fim: p.inicio, nome: "período anterior" };
  }
  const anterior = p.tipo === "mes" ? intervaloMes(ano, mes - 1) : intervaloAno(ano - 1);
  let fim = anterior.fim;
  if (p.inicio <= hoje && hoje < p.fim) {
    const ate =
      p.tipo === "mes"
        ? somarDias(anterior.inicio, Number(hoje.slice(8)))
        : somarDias(`${ano - 1}${hoje.slice(4) === "-02-29" ? "-02-28" : hoje.slice(4)}`, 1);
    fim = menor(ate, anterior.fim);
  }
  return { inicio: anterior.inicio, fim, nome: p.tipo === "mes" ? "mês anterior" : "ano anterior" };
}

export const mesesDoAno = (ano: number) => NOMES.map((_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);

/** Opções do seletor: as rápidas, os 12 meses do ano vigente e os anos com coleta. */
export function opcoesPeriodo(rapidas: string[], anos: number[], hoje: string): string[] {
  const atual = Number(hoje.slice(0, 4));
  const lista = [...new Set([atual, ...anos])].sort((a, b) => b - a);
  return [...rapidas, ...mesesDoAno(atual), ...lista.map((a) => `Ano ${a}`)];
}

/** Dia (AAAA-MM-DD) já parametrizado em SQL -> meia-noite em São Paulo. */
export const diaSql = (param: string) => `${param}::date::timestamp AT TIME ZONE 'America/Sao_Paulo'`;

export function rotuloPeriodo(valor: string): string {
  const m = MES.exec(valor);
  if (m) return `${NOMES[Number(m[2]) - 1]} de ${m[1]}`;
  const c = PERSONALIZADO.exec(valor);
  const br = (d: string) => d.split("-").reverse().join("/");
  return c ? `${br(c[1])} a ${br(c[2])}` : valor;
}
