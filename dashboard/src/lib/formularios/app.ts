// Formulário publicado no formato que o app usa: estrutura do banco + aparência (cartões, rótulos curtos) do layout do app.
import { getMobilePool } from "@/lib/db";
import layout from "./layout-app.json";

type Objeto = Record<string, unknown>;
const PERGUNTAS = new Map<string, Objeto>((layout.questions as Objeto[]).map((q) => [q.key as string, q]));
const SECOES = new Map<number, Objeto>((layout.sections as Objeto[]).map((s) => [s.id as number, s]));
const COLUNA_NOVAS = 1000;
const TIPO_APP: Record<string, string> = {
  UNICA_ESCOLHA: "single", MULTIPLA_ESCOLHA: "multi", NUMERO: "integer", MOEDA: "currency", ESCALA_0_10: "scale", DATA: "date", TEXTO: "text",
};

export async function formularioDoApp(): Promise<Objeto | null> {
  const db = getMobilePool();
  const v = (await db.query("SELECT id, numero FROM oto.formulario_versao WHERE publicada ORDER BY numero DESC, id DESC LIMIT 1")).rows[0];
  if (!v) return null;
  const [secoes, perguntas] = await Promise.all([
    db.query("SELECT id, ordem, titulo FROM oto.secao WHERE formulario_versao_id = $1 ORDER BY ordem", [v.id]),
    db.query(
      `SELECT p.secao_id, p.codigo, p.enunciado, p.tipo, p.grupo_itens, p.config,
              (SELECT coalesce(json_agg(o.rotulo ORDER BY o.ordem), '[]') FROM oto.opcao o WHERE o.pergunta_id = p.id) AS opcoes,
              (SELECT rv.parametros FROM oto.regra_validacao rv WHERE rv.pergunta_id = p.id AND rv.ativa ORDER BY rv.id LIMIT 1) AS faixa
         FROM oto.pergunta p JOIN oto.secao s ON s.id = p.secao_id WHERE s.formulario_versao_id = $1 ORDER BY s.ordem, p.ordem`,
      [v.id]
    ),
  ]);
  const itens = [...PERGUNTAS.values()].filter((q) => q.type === "rating");
  const saida: Objeto = { version: v.numero, sections: [] as Objeto[], questions: [] as Objeto[] };
  let novas = 0;
  for (const s of secoes.rows) {
    const daSecao = perguntas.rows.filter((p) => p.secao_id === s.id);
    let posicao = 0;
    const primeira = daSecao.map((p) => PERGUNTAS.get(p.codigo)).find(Boolean);
    const matriz = daSecao.find((p) => p.tipo === "MATRIZ_AVALIACAO");
    const prefixo = matriz ? (matriz.grupo_itens === "SERVICO" ? "servico_" : "atrativo_") : null;
    const dosItens = prefixo ? itens.filter((q) => String(q.key).startsWith(prefixo)) : [];
    const modelo = SECOES.get((primeira ?? dosItens[0])?.section as number);
    (saida.sections as Objeto[]).push({ subtitle: "", reviewTitle: s.titulo, ...modelo, id: s.ordem, title: s.titulo });
    for (const p of daSecao) {
      if (p.tipo === "MATRIZ_AVALIACAO") {
        for (const q of dosItens) (saida.questions as Objeto[]).push({ ...q, section: s.ordem, position: ++posicao });
        continue;
      }
      const base = PERGUNTAS.get(p.codigo);
      const doSeed = new Map(((base?.options as Objeto[]) ?? []).map((o) => [String(o.value), o]));
      const original = base && p.codigo === "estado";
      const opcoes = original
        ? base.options
        : (p.opcoes as string[]).map((rotulo) => doSeed.get(rotulo) ?? { value: rotulo, label: rotulo });
      const pergunta: Objeto = {
        ...(base ?? {
          key: p.codigo, type: TIPO_APP[p.tipo] ?? "text", sourceText: p.enunciado, xlsxColumn: COLUNA_NOVAS + ++novas,
          ...(p.tipo === "ESCALA_0_10" && { min: 0, max: 10 }), ...(p.tipo === "TEXTO" && { maxLength: 500 }),
        }),
        ...(!base && p.config?.dependsOn && { dependsOn: p.config.dependsOn }),
        section: s.ordem,
        position: ++posicao,
        label: p.enunciado,
      };
      if (base?.options || (p.opcoes as string[]).length) pergunta.options = opcoes;
      delete pergunta.suspectMin;
      delete pergunta.suspectMax;
      if (p.faixa?.min !== null && p.faixa?.min !== undefined) pergunta.suspectMin = p.faixa.min;
      if (p.faixa?.max !== null && p.faixa?.max !== undefined) pergunta.suspectMax = p.faixa.max;
      (saida.questions as Objeto[]).push(pergunta);
    }
  }
  return saida;
}
