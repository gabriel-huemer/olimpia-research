// Traduz uma linha do log_auditoria para a tela. Módulo puro, testado com `node --test`.

export type Dados = Record<string, unknown> | null;

export const ACOES = ["Inseriu", "Alterou", "Aprovou", "Corrigiu", "Excluiu"] as const;
export type Acao = (typeof ACOES)[number];

export const ITENS: Record<string, string> = {
  usuario: "Usuário",
  perfil_acesso: "Perfil de acesso",
  dispositivo: "Aparelho",
  estabelecimento: "Estabelecimento",
  item_avaliacao: "Item de avaliação",
  local_coleta: "Local de coleta",
  formulario: "Formulário",
  formulario_versao: "Versão do formulário",
  secao: "Seção",
  pergunta: "Pergunta",
  opcao: "Opção",
  regra_validacao: "Regra de alerta",
  regra_exibicao: "Regra de exibição",
  pesquisa: "Pesquisa",
  sinalizacao: "Resposta sinalizada",
  resposta: "Resposta",
  resposta_valor: "Valor da resposta",
  avaliacao_item: "Avaliação",
  importacao: "Importação",
  indicador: "Indicador",
  dashboard: "Painel",
  dashboard_widget: "Gráfico",
  publicacao_item: "Publicação",
};

const DECISAO: Record<string, Acao> = { APROVADA: "Aprovou", CORRIGIDA: "Corrigiu", EXCLUIDA: "Excluiu" };
// Credenciais nunca aparecem, nem para quem vê a auditoria.
const SECRETOS = /senha|hash|token|codigo_acesso/i;
const MAX = 300;

function texto(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (typeof v === "boolean") return v ? "sim" : "não";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

const valor = (campo: string, v: unknown) => (SECRETOS.test(campo) ? "(oculto)" : texto(v));
const cortar = (s: string) => (s.length > MAX ? `${s.slice(0, MAX - 1)}…` : s);

function mudancas(antes: Dados, depois: Dados): string {
  const campos = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})])];
  const diferentes = campos.filter((c) => JSON.stringify(antes?.[c] ?? null) !== JSON.stringify(depois?.[c] ?? null));
  if (!diferentes.length) return "sem mudança visível (a senha não é registrada)";
  return diferentes.map((c) => `${c.replaceAll("_", " ")}: ${valor(c, antes?.[c])} → ${valor(c, depois?.[c])}`).join(" · ");
}

function resumo(d: Dados): string {
  const campos = ["nome", "protocolo", "titulo", "enunciado", "rotulo", "arquivo_nome", "motivo", "numero", "codigo"];
  const c = campos.find((x) => d?.[x] !== undefined && d[x] !== null);
  return c ? texto(d?.[c]) : "";
}

export function descrever(entidade: string, operacao: string, antes: Dados, depois: Dados): { acao: Acao; item: string; alteracao: string } {
  const item = ITENS[entidade] ?? entidade;
  if (operacao === "INSERT") return { acao: "Inseriu", item, alteracao: cortar(resumo(depois)) };
  if (operacao === "DELETE") return { acao: "Excluiu", item, alteracao: cortar(resumo(antes)) };
  const decisao = entidade === "sinalizacao" ? DECISAO[String(depois?.status)] : undefined;
  if (decisao && antes?.status === "PENDENTE") {
    const de = texto(antes?.valor_original);
    const para = decisao === "Corrigiu" ? ` → ${texto(depois?.valor_corrigido)}` : "";
    const motivo = depois?.justificativa ? ` · motivo: ${texto(depois.justificativa)}` : "";
    return { acao: decisao, item, alteracao: cortar(`valor ${de}${para}${motivo}`) };
  }
  return { acao: "Alterou", item, alteracao: cortar(mudancas(antes, depois)) };
}
