// Estrutura do formulário publicado, para desenhar a digitação manual.
import { getDbPool } from "@/lib/db";

export interface CampoFormulario {
  chave: string;
  enunciado: string;
  tipo: string;
  opcoes: string[];
}
export interface SecaoFormulario {
  titulo: string;
  campos: CampoFormulario[];
}

const CONCEITOS = ["Ótimo", "Regular", "Ruim", "Não sei", "Não utilizei"];

export async function formularioAtivo(): Promise<SecaoFormulario[]> {
  const db = getDbPool();
  const { rows } = await db.query(
    `SELECT s.id AS secao, s.titulo, p.codigo, p.enunciado, p.tipo, p.grupo_itens,
            (SELECT coalesce(json_agg(o.rotulo ORDER BY o.ordem), '[]') FROM oto.opcao o WHERE o.pergunta_id = p.id) AS opcoes
       FROM oto.secao s JOIN oto.pergunta p ON p.secao_id = s.id
      WHERE s.formulario_versao_id = (SELECT id FROM oto.formulario_versao WHERE publicada ORDER BY numero DESC, id DESC LIMIT 1)
      ORDER BY s.ordem, p.ordem`
  );
  const itens = (await db.query("SELECT codigo, nome, tipo FROM oto.item_avaliacao WHERE codigo IS NOT NULL ORDER BY codigo")).rows;
  const secoes = new Map<string, SecaoFormulario>();
  for (const l of rows) {
    const secao: SecaoFormulario = secoes.get(l.secao) ?? { titulo: l.titulo, campos: [] };
    secoes.set(l.secao, secao);
    if (l.tipo === "MATRIZ_AVALIACAO") {
      for (const i of itens.filter((x) => x.tipo === l.grupo_itens)) {
        secao.campos.push({ chave: i.codigo, enunciado: i.nome, tipo: "UNICA_ESCOLHA", opcoes: CONCEITOS });
      }
    } else secao.campos.push({ chave: l.codigo, enunciado: l.enunciado, tipo: l.tipo, opcoes: l.opcoes });
  }
  return [...secoes.values()];
}
