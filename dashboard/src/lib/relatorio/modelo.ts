// Transforma os dados do relatório nas páginas de cada versão. Só números: sem leitura nem recomendação.
import type { Fatia } from "../paineis-types";
import { rotuloPeriodo } from "../periodo.ts";
import type { DadosRelatorio, Medidas, PontoMedido } from "./tipos";

export type Versao = "resumo" | "relatorio" | "apresentacao";

export interface ItemBarra {
  rotulo: string;
  texto: string;
  /** 0 a 100 */
  largura: number;
}
export interface Ponto {
  rotulo: string;
  valor: number | null;
  texto: string;
}
export type Bloco =
  | { tipo: "kpis"; itens: Array<{ valor: string; rotulo: string; detalhe?: string }> }
  | { tipo: "barras"; titulo: string; nota?: string; cor?: "verde" | "vermelho"; itens: ItemBarra[] }
  | { tipo: "colunas" | "linha"; titulo: string; nota?: string; altura?: number; pontos: Ponto[] }
  | { tipo: "empilhada"; titulo: string; nota?: string; legenda: string[]; linhas: Array<{ rotulo: string; partes: number[] }> }
  | { tipo: "dispersao"; titulo: string; nota?: string; altura?: number; pontos: Array<{ n: number; x: number; y: number }> }
  | { tipo: "tabela"; titulo: string; nota?: string; colunas: string[]; linhas: string[][]; total?: string[] }
  | { tipo: "texto"; texto: string };

export interface PaginaModelo {
  titulo: string;
  /** Cada linha tem 1 ou mais colunas; cada coluna, blocos empilhados. */
  linhas: Bloco[][][];
}
export interface Modelo {
  versao: Versao;
  formato: "A4" | "SLIDE";
  titulo: string;
  periodo: string;
  filtros: string[];
  rodape: string;
  capa?: { subtitulo: string; itens: Array<{ titulo: string; pagina: number }> };
  paginas: PaginaModelo[];
}

export const NOMES: Record<Versao, { titulo: string; descricao: string; arquivo: string }> = {
  resumo: { titulo: "Resumo de 1 página", descricao: "Os números principais em uma folha A4.", arquivo: "Resumo" },
  relatorio: { titulo: "Relatório (8 páginas)", descricao: "Todas as abas e o quadro por período, em A4.", arquivo: "Relatorio" },
  apresentacao: { titulo: "Apresentação (12 slides)", descricao: "Um assunto por slide, em 16:9.", arquivo: "Apresentacao" },
};

const br = (d: string) => d.split("-").reverse().join("/");
const inteiro = (n: number) => n.toLocaleString("pt-BR");
const decimal = (n: number) => n.toFixed(1).replace(".", ",");
const ou = (v: number | null, f: (n: number) => string) => (v === null ? "—" : f(v));
const porcento = (n: number) => `${n}%`;
const reais = (n: number) => `R$ ${inteiro(Math.round(n))}`;
export const curto = (s: string, max = 34) => {
  const limpo = s.replace(/\s*\(.*\)$/, "").replace(/:$/, "").replace(/sal[áa]rios m[íi]nimos/i, "SM").trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo;
};

const barras = (titulo: string, fatias: Fatia[], limite: number, nota?: string): Bloco => {
  const teto = Math.max(1, ...fatias.map((f) => f.percentual));
  const cortada = fatias.length > limite;
  // Ficam os maiores, na ordem original (faixas de renda, prazo etc. têm sequência própria).
  const maiores = new Set([...fatias].sort((a, b) => b.n - a.n).slice(0, limite));
  const lista = cortada ? fatias.filter((f) => maiores.has(f)) : fatias;
  const aviso = cortada ? `${limite} maiores de ${fatias.length}` : undefined;
  return {
    tipo: "barras", titulo, nota: [nota, aviso].filter(Boolean).join(" · ") || undefined,
    itens: lista.map((f) => ({ rotulo: curto(f.rotulo), texto: porcento(f.percentual), largura: (f.percentual / teto) * 100 })),
  };
};
/** Os maiores e o restante somado, para a lista continuar fechando. */
const comOutros = (fatias: Fatia[], limite: number): Fatia[] => {
  const lista = [...fatias].sort((a, b) => b.n - a.n);
  if (lista.length <= limite) return lista;
  const resto = lista.slice(limite);
  const soma = (c: "n" | "percentual") => resto.reduce((s, f) => s + f[c], 0);
  return [...lista.slice(0, limite), { rotulo: resto.length === 1 ? resto[0].rotulo : `Outros ${resto.length} estados`, n: soma("n"), percentual: soma("percentual") }];
};

const POR = { dia: "dia", semana: "semana", mes: "mês", ano: "ano" };

function pontos(serie: PontoMedido[], campo: keyof Medidas, f: (n: number) => string): Ponto[] {
  return serie.map((p) => ({ rotulo: p.rotulo + (p.parcial ? "*" : ""), valor: p[campo], texto: ou(p[campo], f) }));
}

export function montarModelo(versao: Versao, d: DadosRelatorio): Modelo {
  const t = d.total;
  const p = d.paineis;
  const por = `por ${POR[d.granularidade]}`;
  const parcial = d.serie.some((s) => s.parcial) ? "* período incompleto" : undefined;
  const serie = (tipo: "colunas" | "linha", titulo: string, campo: keyof Medidas, f: (n: number) => string, altura?: number): Bloco => ({
    tipo, titulo: `${titulo} ${por}`, nota: parcial, altura, pontos: pontos(d.serie, campo, f),
  });
  const kpi = {
    total: { valor: inteiro(t.n), rotulo: "pesquisas", detalhe: p.panorama.crescimento || undefined },
    nps: { valor: ou(t.nps, String), rotulo: "NPS (recomendação)" },
    perm: { valor: ou(t.permanencia, decimal), rotulo: "noites de permanência" },
    gasto: { valor: ou(t.gasto, reais), rotulo: "gasto médio diário" },
    retorno: { valor: ou(t.retorno, porcento), rotulo: "pretendem voltar" },
    primeira: { valor: ou(t.primeiraVez, porcento), rotulo: "visitam pela 1ª vez" },
  };
  const nps: Bloco = {
    tipo: "empilhada", titulo: "Composição do NPS", nota: "% das respostas", legenda: ["Promotores", "Neutros", "Detratores"],
    linhas: t.promotores === null || t.neutros === null || t.detratores === null
      ? [] : [{ rotulo: "", partes: [t.promotores, t.neutros, t.detratores] }],
  };
  const servicos = (limite: number): Bloco => ({
    tipo: "empilhada", titulo: "Avaliação dos serviços", nota: "% de quem avaliou", legenda: ["Ótimo", "Regular", "Ruim"],
    linhas: [...d.servicos].sort((a, b) => b.otimo - a.otimo || a.ruim - b.ruim).slice(0, limite)
      .map((s) => ({ rotulo: curto(s.nome, 30), partes: [s.otimo, s.regular, s.ruim] })),
  });
  const porConceito = (titulo: string, c: "otimo" | "ruim", cor: "verde" | "vermelho"): Bloco => ({
    tipo: "barras", titulo, nota: "% de quem avaliou", cor,
    itens: [...d.servicos].sort((a, b) => b[c] - a[c]).slice(0, 4).map((s) => ({ rotulo: curto(s.nome, 26), texto: porcento(s[c]), largura: s[c] })),
  });
  const atrativos = [...p.atracoes.atrativos].sort((a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes);
  const avaliaram = (n: number) => (t.n ? Math.round((n / t.n) * 100) : 0);
  const dispersao = (limite: number, altura: number): Bloco => ({
    tipo: "dispersao", titulo: "Avaliações × nota", nota: "x: % que avaliou · y: nota", altura,
    pontos: atrativos.slice(0, limite).map((a, i) => ({ n: i + 1, x: t.n ? (a.avaliacoes / t.n) * 100 : 0, y: a.nota })),
  });
  const tabelaAtrativos = (limite: number): Bloco => ({
    tipo: "tabela", titulo: "Atrações por nota média", nota: "nota de 1 a 5", colunas: ["Atração", "Avaliaram", "Nota"],
    linhas: atrativos.slice(0, limite).map((a, i) => [`${i + 1}. ${curto(a.nome, 46)}`, porcento(avaliaram(a.avaliacoes)), decimal(a.nota)]),
  });
  const maisAvaliadas = (limite: number): Bloco => {
    const lista = [...atrativos].sort((a, b) => b.avaliacoes - a.avaliacoes).slice(0, limite);
    return {
      tipo: "barras", titulo: "Atrações mais avaliadas", nota: "% das pesquisas",
      itens: lista.map((a) => ({ rotulo: curto(a.nome, 26), texto: porcento(avaliaram(a.avaliacoes)), largura: (a.avaliacoes / Math.max(1, lista[0].avaliacoes)) * 100 })),
    };
  };
  const tetoRenda = Math.max(1, ...p.impacto.gastoPorRenda.map((g) => g.valor));
  const gastoRenda: Bloco = {
    tipo: "barras", titulo: "Gasto diário por renda familiar", nota: "média em R$",
    itens: p.impacto.gastoPorRenda.map((g) => ({ rotulo: curto(g.faixa), texto: reais(g.valor), largura: (g.valor / tetoRenda) * 100 })),
  };
  const cidades = (limite: number): Bloco => {
    // "Outras cidades" é sempre a última: continua na lista mesmo quando há corte.
    const lista = p.perfil.cidades.length > limite ? [...p.perfil.cidades.slice(0, limite - 1), ...p.perfil.cidades.slice(-1)] : p.perfil.cidades;
    const teto = Math.max(1, ...lista.map((c) => c.percentual));
    return {
      tipo: "barras", titulo: "Cidades de origem", nota: "com 5 respostas ou mais",
      itens: lista.map((c) => ({ rotulo: curto(c.cidade, 28), texto: porcento(c.percentual), largura: (c.percentual / teto) * 100 })),
    };
  };
  const concorrencia = (limite: number): Bloco => {
    const teto = Math.max(1, ...p.perfil.concorrencia.map((c) => c.n));
    return {
      tipo: "barras", titulo: "Outros destinos considerados", nota: "nº de citações",
      itens: p.perfil.concorrencia.slice(0, limite).map((c) => ({ rotulo: curto(c.rotulo, 28), texto: inteiro(c.n), largura: (c.n / teto) * 100 })),
    };
  };
  const quadro: Bloco = {
    tipo: "tabela", titulo: `Quadro ${por}`, nota: parcial,
    colunas: ["Período", "Pesquisas", "NPS", "Permanência", "Gasto/dia", "Retorno", "1ª vez"],
    linhas: d.serie.slice(-24).map((s) => linhaQuadro(s.rotulo + (s.parcial ? "*" : ""), s)),
    total: linhaQuadro("Total", t),
  };
  const qualidade: Bloco = {
    tipo: "tabela", titulo: "Qualidade dos dados", colunas: ["Item", "Qtd."],
    linhas: [
      ["Pesquisas no recorte", inteiro(d.qualidade.recebidas)],
      ["Com resposta em revisão", inteiro(d.qualidade.emRevisao)],
      ["Com resposta excluída", inteiro(d.qualidade.comExcluida)],
      ["Pesquisadores de campo", inteiro(d.qualidade.pesquisadores)],
      ["Locais de coleta", inteiro(d.locais.length)],
    ],
  };
  const metodo: Bloco = {
    tipo: "texto",
    texto: "Amostra por conveniência: os resultados descrevem os entrevistados, não todos os turistas da cidade. Respostas em revisão ou excluídas não entram nas médias e nos percentuais. NPS = % de promotores (9 e 10) menos % de detratores (0 a 6). Nota de 1 a 5: Ótimo 5, Regular 3, Ruim 1.",
  };
  const recorrente: Bloco = {
    tipo: "empilhada", titulo: "Já visitou Olímpia antes?", nota: "% das respostas", legenda: ["Já visitou", "Primeira vez"],
    linhas: t.primeiraVez === null ? [] : [{ rotulo: "", partes: [100 - t.primeiraVez, t.primeiraVez] }],
  };
  const pcd: Bloco = {
    tipo: "kpis", itens: [{ valor: ou(p.infraestrutura.gruposPcd, porcento), rotulo: "dos grupos com pessoa com deficiência" }],
  };
  const pag = (titulo: string, ...linhas: Bloco[][][]): PaginaModelo => ({ titulo, linhas });

  const versoes: Record<Versao, () => Pick<Modelo, "formato" | "titulo" | "capa" | "paginas">> = {
    resumo: () => ({
      formato: "A4",
      titulo: "Pesquisa de demanda turística",
      paginas: [
        pag(`${inteiro(t.n)} pesquisas · NPS ${ou(t.nps, String)}`,
          [[{ tipo: "kpis", itens: [kpi.perm, kpi.gasto, kpi.retorno, kpi.primeira] }]],
          [[serie("colunas", "Pesquisas", "n", inteiro, 112)], [barras("Estados de origem", comOutros(d.estados, 5), 6)]],
          [[porConceito("Serviços: maior % de Ótimo", "otimo", "verde")], [porConceito("Serviços: maior % de Ruim", "ruim", "vermelho")]],
          [[barras("Antecedência da decisão", p.impacto.antecedencia, 8)], [barras("Com quem viaja", d.comQuem, 8, "múltipla escolha")]],
          [[barras("Motivos da viagem", p.perfil.motivos, 4, "múltipla escolha")], [barras("Meio de transporte", p.atracoes.transporte, 4)]],
          [[barras("Hospedagem", p.impacto.hospedagem, 4)], [maisAvaliadas(4)]]),
      ],
    }),
    relatorio: () => {
      const paginas = [
        pag("Resumo",
          [[{ tipo: "kpis", itens: [kpi.total, kpi.nps, kpi.perm] }]],
          [[{ tipo: "kpis", itens: [kpi.retorno, kpi.gasto, kpi.primeira] }]],
          [[serie("colunas", "Pesquisas", "n", inteiro, 170)]],
          [[nps], [recorrente]],
          [[barras("Locais de coleta", d.locais, 5)], [barras("Estados de origem", comOutros(d.estados, 4), 5)]]),
        pag("1. Panorama da demanda",
          [[serie("linha", "NPS", "nps", String, 130)], [serie("linha", "Intenção de retorno", "retorno", porcento, 130)]],
          [[serie("linha", "Permanência em noites", "permanencia", decimal, 130)], [serie("linha", "Primeira visita", "primeiraVez", porcento, 130)]],
          [[barras("Estados de origem", comOutros(d.estados, 8), 9)], [nps, recorrente]]),
        pag("2. Perfil do turista",
          [[barras("Faixa de idade", p.perfil.idades, 5)], [barras("Com quem viaja", d.comQuem, 7, "múltipla escolha")]],
          [[cidades(9)], [barras("Como conheceu Olímpia", p.perfil.conhecimento, 9)]],
          [[barras("Motivos da viagem", p.perfil.motivos, 9, "múltipla escolha")], [barras("Escolaridade", p.perfil.escolaridade, 6), barras("Estado civil", p.perfil.estadoCivil, 7)]]),
        pag("3. Atrações", [[dispersao(22, 230)]], [[tabelaAtrativos(22)]]),
        pag("4. Infraestrutura e serviços",
          [[servicos(12)]],
          [[barras("Meio de transporte", p.atracoes.transporte, 6)], [barras("Do aeroporto até Olímpia", p.atracoes.aeroporto, 6, "quem veio de avião")]],
          [[barras("Onde faz as refeições", p.impacto.refeicoes, 5, "múltipla escolha")], [barras("Expectativa atendida?", p.infraestrutura.expectativa, 3), pcd]]),
        pag("5. Impacto econômico",
          [[serie("linha", "Gasto diário", "gasto", reais, 150)], [gastoRenda]],
          [[barras("Renda familiar", p.impacto.renda, 7)], [barras("Antecedência da decisão", p.impacto.antecedencia, 8)]],
          [[barras("Tipo de hospedagem", p.impacto.hospedagem, 9)], [concorrencia(9)]]),
        pag("6. Quadro por período e metodologia", [[quadro]], [[qualidade], [barras("Locais de coleta", d.locais, 6)]], [[metodo]]),
      ];
      return {
        formato: "A4",
        titulo: "Relatório de pesquisa de demanda turística",
        capa: { subtitulo: `${inteiro(t.n)} pesquisas`, itens: paginas.map((x, i) => ({ titulo: x.titulo, pagina: i + 2 })) },
        paginas,
      };
    },
    apresentacao: () => ({
      formato: "SLIDE",
      titulo: "Pesquisa de demanda turística",
      capa: { subtitulo: `${inteiro(t.n)} pesquisas`, itens: [] },
      paginas: [
        pag("Resumo", [[{ tipo: "kpis", itens: [kpi.total, kpi.nps, kpi.perm] }]], [[{ tipo: "kpis", itens: [kpi.retorno, kpi.gasto, kpi.primeira] }]]),
        pag("Coleta", [[serie("colunas", "Pesquisas", "n", inteiro, 310)]]),
        pag("Recomendação", [[{ tipo: "kpis", itens: [kpi.nps] }, nps], [serie("linha", "NPS", "nps", String, 250)]]),
        pag("Origens", [[barras("Estados de origem", comOutros(d.estados, 7), 8)], [cidades(8)]]),
        pag("Perfil", [[barras("Faixa de idade", p.perfil.idades, 5)], [barras("Com quem viaja", d.comQuem, 6, "múltipla escolha")]]),
        pag("Motivação e fidelidade", [[barras("Motivos da viagem", p.perfil.motivos, 6, "múltipla escolha")], [recorrente, { tipo: "kpis", itens: [kpi.retorno] }]]),
        pag("Atrações", [[dispersao(10, 270)], [tabelaAtrativos(10)]]),
        pag("Serviços", [[servicos(12)]]),
        pag("Como chegam e onde ficam", [[barras("Meio de transporte", p.atracoes.transporte, 6)], [barras("Tipo de hospedagem", p.impacto.hospedagem, 7)]]),
        pag("Impacto econômico", [[serie("linha", "Gasto diário", "gasto", reais, 250)], [gastoRenda]]),
        pag("Expectativa, concorrência e método", [[barras("Expectativa atendida?", p.infraestrutura.expectativa, 3), metodo], [concorrencia(4), qualidade]]),
      ],
    }),
  };

  const filtros = filtrosAtivos(d);
  return {
    versao,
    ...versoes[versao](),
    periodo: `${rotuloPeriodo(d.filtros.periodo)} (${br(d.de)} a ${br(d.ate)})`,
    filtros,
    rodape: [`Emitido em ${br(d.emitidoEm)}`, `${inteiro(t.n)} pesquisas`, "amostra por conveniência", ...(d.ficticio ? ["DADOS FICTÍCIOS"] : [])].join(" · "),
  };
}

function linhaQuadro(rotulo: string, m: Medidas): string[] {
  return [rotulo, inteiro(m.n), ou(m.nps, String), ou(m.permanencia, decimal), ou(m.gasto, reais), ou(m.retorno, porcento), ou(m.primeiraVez, porcento)];
}

const ROTULO_FILTRO: Record<string, string> = {
  genero: "Gênero", faixaIdade: "Idade", cidade: "Cidade", hospedagem: "Hospedagem", transporte: "Transporte", localPesquisa: "Local",
};
function filtrosAtivos(d: DadosRelatorio): string[] {
  return Object.entries(ROTULO_FILTRO).flatMap(([k, nome]) => {
    const v = d.filtros[k as keyof typeof d.filtros];
    return v && v !== "Todos" && v !== "Todas" ? [`${nome}: ${curto(v, 40)}`] : [];
  });
}

export function nomeDoArquivo(versao: Versao, d: DadosRelatorio): string {
  const seguinte = new Date(Date.parse(`${d.ate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const mesmo = (n: number) => d.de.slice(0, n) === d.ate.slice(0, n);
  let trecho = `${d.de}_a_${d.ate}`;
  if (mesmo(4) && d.de.endsWith("-01-01") && d.ate.endsWith("-12-31")) trecho = d.de.slice(0, 4);
  else if (mesmo(7) && d.de.endsWith("-01") && seguinte.endsWith("-01")) trecho = d.de.slice(0, 7);
  return `OTO_${NOMES[versao].arquivo}_${trecho}.pdf`;
}
