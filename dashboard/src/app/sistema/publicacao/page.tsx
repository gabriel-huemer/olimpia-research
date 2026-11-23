"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import { Indicadores } from "@/components/Indicadores";
import { BOTAO_CLARO, BOTAO_VERDE, CAIXA, Janela, Pagina, Selo, Tabela } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { IndicadorPublico, ItemPublicacao } from "@/lib/publicacao/publicacao";

interface Resposta {
  itens: ItemPublicacao[];
  ultima: { quando: string; por: string } | null;
}

export default function PublicacaoPage() {
  const { showToast } = useApp();
  const { dados, erro, setErro, recarregar } = useDados<Resposta>("/api/publicacao", false);
  const [mudancas, setMudancas] = useState<Record<string, boolean>>({});
  const [previa, setPrevia] = useState<IndicadorPublico[] | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const marcado = (i: ItemPublicacao) => mudancas[i.codigo] ?? i.publico;
  const codigos = (dados?.itens ?? []).filter(marcado).map((i) => i.codigo);
  const pendentes = (dados?.itens ?? []).filter((i) => marcado(i) !== i.publico).length;

  const executar = async (f: () => Promise<void>) => {
    setOcupado(true);
    try {
      await f();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const verPrevia = () =>
    executar(async () => setPrevia((await api<{ indicadores: IndicadorPublico[] }>(`/api/publicacao?previa=${codigos.join(",")}`)).indicadores));

  const publicar = () =>
    executar(async () => {
      await api("/api/publicacao", { method: "PUT", body: { codigos } });
      setMudancas({});
      recarregar();
      showToast("Seleção publicada.");
    });

  return (
    <Pagina
      titulo="Publicação"
      subtitulo="Escolha o que aparece na página para o site da Prefeitura. O padrão é não publicar."
      icone={<Globe className="w-5 h-5" />}
      erro={erro}
      acoes={
        <>
          <button type="button" disabled={ocupado || !dados} onClick={() => void verPrevia()} className={BOTAO_CLARO}>Pré-visualizar</button>
          <button type="button" disabled={ocupado || !pendentes} onClick={() => void publicar()} className={BOTAO_VERDE}>
            Publicar seleção{pendentes ? ` (${pendentes})` : ""}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className={`lg:col-span-8 ${CAIXA}`}>
          <Tabela colunas={["Público", "Indicador", "Aba", "Cuidado"]}>
            {dados?.itens.map((i) => (
              <tr key={i.codigo}>
                <td className="py-2.5 pr-4">
                  <input
                    type="checkbox"
                    aria-label={`Publicar ${i.titulo}`}
                    checked={marcado(i)}
                    onChange={(e) => setMudancas((m) => ({ ...m, [i.codigo]: e.target.checked }))}
                  />
                </td>
                <td className="py-2.5 pr-4 font-medium">{i.titulo}</td>
                <td className="py-2.5 pr-4">{i.aba}</td>
                <td className="py-2.5">{i.risco ? <Selo cor="amarelo">{i.risco}</Selo> : <Selo cor="verde">agregado</Selo>}</td>
              </tr>
            ))}
          </Tabela>
        </div>
        <div className={`lg:col-span-4 ${CAIXA} text-xs text-slate-700 space-y-3`}>
          <p>
            A página pública fica em{" "}
            <a href="/publico" target="_blank" rel="noreferrer" className="font-semibold text-[#008767] underline">/publico</a>. O site da
            Prefeitura pode incorporá-la:
          </p>
          <code className="block bg-slate-100 rounded p-2 break-all">{'<iframe src="https://ENDERECO-DO-OTO/publico"></iframe>'}</code>
          <p>Ela também oferece a planilha de dados abertos e a versão em PDF (impressão).</p>
          <p>Indicadores com menos de 5 respostas e o texto livre nunca aparecem.</p>
          <p>{dados?.ultima ? `Última alteração: ${dados.ultima.quando}, por ${dados.ultima.por}.` : "Nada foi publicado ainda."}</p>
        </div>
      </div>

      {previa && (
        <Janela titulo="Como o público verá" aoFechar={() => setPrevia(null)}>
          {previa.length ? <Indicadores lista={previa} /> : <p className="text-xs text-slate-600">Nenhum indicador publicado no momento.</p>}
          <div className="text-right mt-4">
            <button type="button" onClick={() => setPrevia(null)} className={BOTAO_CLARO}>Fechar</button>
          </div>
        </Janela>
      )}
    </Pagina>
  );
}
