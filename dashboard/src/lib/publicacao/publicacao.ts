// Indicadores públicos no site da Prefeitura (RF21). O padrão é não publicar.
import { getDbPool, withAuditTransaction } from "@/lib/db";
import { ErroAdmin } from "@/lib/auth/admin";
import { calcularPainel } from "@/lib/paineis";
import type { Aba, Fatia, NotaItem, Paineis } from "@/lib/paineis-types";

/** Indicador com menos respostas que isso não aparece, mesmo aprovado (RN10). */
export const MINIMO = 5;

export interface Serie {
  rotulo: string;
  texto: string;
  /** 0 a 100, para a barra. */
  largura: number;
}
export interface IndicadorPublico {
  codigo: string;
  titulo: string;
  series: Serie[];
}
export interface ItemPublicacao {
  codigo: string;
  titulo: string;
  aba: string;
  risco: string | null;
  publico: boolean;
}

interface Definicao {
  codigo: string;
  titulo: string;
  aba: Aba;
  nomeAba: string;
  risco?: string;
  series: (p: Paineis) => Serie[];
}

const porcento = (v: number) => `${v}%`;
const deFatias = (lista: Fatia[]): Serie[] =>
  lista.reduce((s, f) => s + f.n, 0) < MINIMO
    ? []
    : lista.filter((f) => f.n > 0).map((f) => ({ rotulo: f.rotulo, texto: porcento(f.percentual), largura: f.percentual }));
const deNotas = (lista: NotaItem[]): Serie[] =>
  lista
    .filter((i) => i.avaliacoes >= MINIMO)
    .map((i) => ({ rotulo: i.nome, texto: i.nota.toFixed(1).replace(".", ","), largura: (i.nota / 5) * 100 }));
const numero = (rotulo: string, texto: string): Serie[] => [{ rotulo, texto, largura: 0 }];

const DEFINICOES: Definicao[] = [
  {
    codigo: "fluxo_mensal", titulo: "Pesquisas por mês", aba: "panorama", nomeAba: "Panorama",
    series: ({ panorama: p }) =>
      p.pesquisasColetadas < MINIMO ? [] : p.sazonalidade.map((m) => ({ rotulo: m.mes, texto: String(m.pesquisas), largura: m.valor })),
  },
  {
    codigo: "nps", titulo: "NPS (recomendação do destino)", aba: "panorama", nomeAba: "Panorama",
    series: ({ panorama: p }) => (p.respostasNps < MINIMO ? [] : numero("NPS", String(p.nps))),
  },
  {
    codigo: "permanencia", titulo: "Permanência média", aba: "panorama", nomeAba: "Panorama",
    series: ({ panorama: p }) =>
      p.pesquisasColetadas < MINIMO || p.permanenciaMedia === "—" ? [] : numero("Noites", String(p.permanenciaMedia)),
  },
  {
    codigo: "origem_estados", titulo: "Origem por estado", aba: "panorama", nomeAba: "Panorama",
    risco: "estado com poucas respostas pode identificar pessoa",
    series: ({ panorama: p }) =>
      p.pesquisasColetadas < MINIMO
        ? []
        : p.origensEstados.map((o) => ({ rotulo: o.uf, texto: porcento(o.percentual), largura: o.percentual })),
  },
  { codigo: "idades", titulo: "Faixa de idade", aba: "perfil", nomeAba: "Perfil", series: ({ perfil }) => deFatias(perfil.idades) },
  {
    codigo: "origem_cidades", titulo: "Origem por cidade (5 respostas ou mais)", aba: "perfil", nomeAba: "Perfil",
    risco: "cidades pequenas podem identificar pessoa",
    series: ({ perfil }) =>
      perfil.cidades.filter((c) => c.respostas >= MINIMO).map((c) => ({ rotulo: c.cidade, texto: porcento(c.percentual), largura: c.percentual })),
  },
  { codigo: "motivos", titulo: "Motivações da viagem", aba: "perfil", nomeAba: "Perfil", series: ({ perfil }) => deFatias(perfil.motivos) },
  { codigo: "conhecimento", titulo: "Como conheceu Olímpia", aba: "perfil", nomeAba: "Perfil", series: ({ perfil }) => deFatias(perfil.conhecimento) },
  {
    codigo: "gasto", titulo: "Gasto médio diário", aba: "impacto", nomeAba: "Impacto econômico",
    series: ({ impacto: i }) =>
      i.respostasGasto < MINIMO || i.gastoDiarioMedio === null
        ? []
        : numero("Por pessoa", i.gastoDiarioMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })),
  },
  {
    codigo: "renda", titulo: "Renda familiar", aba: "impacto", nomeAba: "Impacto econômico", risco: "dado sensível, só em faixas",
    series: ({ impacto }) => deFatias(impacto.renda),
  },
  { codigo: "hospedagem", titulo: "Tipo de hospedagem", aba: "impacto", nomeAba: "Impacto econômico", series: ({ impacto }) => deFatias(impacto.hospedagem) },
  { codigo: "servicos", titulo: "Nota dos serviços (1 a 5)", aba: "infraestrutura", nomeAba: "Infraestrutura", series: ({ infraestrutura }) => deNotas(infraestrutura.servicos) },
  { codigo: "expectativa", titulo: "Expectativa atendida", aba: "infraestrutura", nomeAba: "Infraestrutura", series: ({ infraestrutura }) => deFatias(infraestrutura.expectativa) },
  { codigo: "atrativos", titulo: "Nota dos atrativos (1 a 5)", aba: "atracoes", nomeAba: "Atrações", series: ({ atracoes }) => deNotas(atracoes.atrativos) },
  { codigo: "transporte", titulo: "Meio de transporte", aba: "atracoes", nomeAba: "Atrações", series: ({ atracoes }) => deFatias(atracoes.transporte) },
];
const CODIGOS = new Set(DEFINICOES.map((d) => d.codigo));

async function aprovados(): Promise<Set<string>> {
  const { rows } = await getDbPool().query("SELECT codigo FROM oto.publicacao_item WHERE publico");
  return new Set(rows.map((l) => l.codigo));
}

export async function listarPublicacao(): Promise<{ itens: ItemPublicacao[]; ultima: { quando: string; por: string } | null }> {
  const [publicos, ultima] = await Promise.all([
    aprovados(),
    getDbPool().query(
      `SELECT to_char(p.alterado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS quando, u.nome AS por
         FROM oto.publicacao_item p JOIN oto.usuario u ON u.id = p.alterado_por ORDER BY p.alterado_em DESC LIMIT 1`
    ),
  ]);
  return {
    itens: DEFINICOES.map((d) => ({
      codigo: d.codigo, titulo: d.titulo, aba: d.nomeAba, risco: d.risco ?? null, publico: publicos.has(d.codigo),
    })),
    ultima: ultima.rows[0] ?? null,
  };
}

/** A lista recebida é a seleção inteira: o que não está nela deixa de ser público. */
export async function publicar(autorId: string, codigos: unknown): Promise<void> {
  if (!Array.isArray(codigos) || !codigos.every((c) => typeof c === "string" && CODIGOS.has(c))) {
    throw new ErroAdmin(400, "Seleção inválida.");
  }
  const escolhidos = new Set<string>(codigos);
  await withAuditTransaction(autorId, async (c) => {
    for (const codigo of CODIGOS) {
      await c.query(
        `INSERT INTO oto.publicacao_item (codigo, publico, alterado_por) SELECT $1::varchar, $2::boolean, $3::uuid
          WHERE $2::boolean OR EXISTS (SELECT 1 FROM oto.publicacao_item WHERE codigo = $1::varchar)
         ON CONFLICT (codigo) DO UPDATE SET publico = EXCLUDED.publico, alterado_por = EXCLUDED.alterado_por, alterado_em = now()
          WHERE publicacao_item.publico <> EXCLUDED.publico`,
        [codigo, escolhidos.has(codigo), autorId]
      );
    }
  });
}

/** O que o site mostra. `previa` = seleção ainda não publicada (só para quem tem Sistema). */
export async function indicadoresPublicos(previa?: string[]): Promise<IndicadorPublico[]> {
  const visiveis = previa ? new Set(previa) : await aprovados();
  const escolhidos = DEFINICOES.filter((d) => visiveis.has(d.codigo));
  const filtros = { periodo: `Ano ${new Date().getFullYear()}` };
  const abas = [...new Set(escolhidos.map((d) => d.aba))];
  const paineis = Object.fromEntries(
    await Promise.all(abas.map(async (aba) => [aba, await calcularPainel(aba, filtros, false)]))
  ) as Paineis;
  return escolhidos.map((d) => ({ codigo: d.codigo, titulo: d.titulo, series: d.series(paineis) })).filter((i) => i.series.length > 0);
}
