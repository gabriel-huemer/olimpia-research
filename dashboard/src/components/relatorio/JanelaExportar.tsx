"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import { Aviso, BOTAO_CLARO, BOTAO_VERDE, Janela } from "@/components/pagina";
import type { AnalyticsFilters } from "@/lib/paineis-types";
import { montarModelo, NOMES, nomeDoArquivo, type Versao } from "@/lib/relatorio/modelo";
import type { DadosRelatorio } from "@/lib/relatorio/tipos";

const Previa = dynamic(() => import("@/components/relatorio/Previa"), { ssr: false });
const VERSOES = Object.keys(NOMES) as Versao[];

export function JanelaExportar({
  filtros,
  aoExcel,
  aoFechar,
}: {
  filtros: Required<AnalyticsFilters>;
  aoExcel: () => void;
  aoFechar: () => void;
}) {
  // Retrato do momento em que a janela abriu: a atualização automática da tela não muda o arquivo.
  const [consulta] = useState(() => new URLSearchParams(filtros).toString());
  const [versao, setVersao] = useState<Versao>("resumo");
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [arquivos, setArquivos] = useState<Partial<Record<Versao, Blob>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const arquivo = arquivos[versao];
  const vazio = dados?.total.n === 0;

  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/relatorio?${consulta}`, { cache: "no-store", signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error();
        setDados(d);
      })
      .catch(() => !c.signal.aborted && setErro("Não foi possível montar o relatório."));
    return () => c.abort();
  }, [consulta, tentativa]);

  useEffect(() => {
    if (!dados || vazio || arquivo) return;
    let cancelado = false;
    import("@/components/relatorio/Pdf")
      .then(({ gerarPdf }) => gerarPdf(montarModelo(versao, dados)))
      .then((b) => !cancelado && setArquivos((a) => ({ ...a, [versao]: b })))
      .catch((e) => {
        console.error("[exportação]", e);
        if (!cancelado) setErro("Não foi possível gerar o PDF.");
      });
    return () => {
      cancelado = true;
    };
  }, [dados, vazio, versao, arquivo, tentativa]);

  const tentar = useCallback(() => {
    setErro(null);
    setTentativa((n) => n + 1);
  }, []);

  const baixar = () => {
    if (!arquivo || !dados) return;
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeDoArquivo(versao, dados);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <Janela titulo="Exportar relatório" aoFechar={aoFechar} larga>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <div className="space-y-3">
          <fieldset className="space-y-2">
            <legend className="sr-only">Versão do relatório</legend>
            {VERSOES.map((v) => (
              <label
                key={v}
                className={`flex gap-2.5 border rounded-lg p-3 text-xs cursor-pointer ${versao === v ? "border-[#008767] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <input type="radio" name="versao" value={v} checked={versao === v} onChange={() => { setErro(null); setVersao(v); }} className="mt-0.5 accent-[#008767]" />
                <span>
                  <b className="block text-slate-900">{NOMES[v].titulo}</b>
                  <span className="text-slate-600">{NOMES[v].descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button type="button" onClick={baixar} disabled={!arquivo} className={`${BOTAO_VERDE} w-full inline-flex items-center justify-center gap-2`}>
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
          <button type="button" onClick={aoExcel} className={`${BOTAO_CLARO} w-full`}>Planilha Excel desta aba</button>
          <button type="button" onClick={aoFechar} className={`${BOTAO_CLARO} w-full`}>Fechar</button>
        </div>
        <div className="min-w-0 bg-slate-100 rounded-lg p-3 sm:p-4 lg:max-h-[72vh] lg:overflow-y-auto" aria-live="polite">
          {erro && (
            <>
              <Aviso>{erro}</Aviso>
              <button type="button" onClick={tentar} className={BOTAO_CLARO}>Tentar de novo</button>
            </>
          )}
          {!erro && vazio && <p className="text-xs text-slate-600">Nenhuma pesquisa com os filtros escolhidos. Mude o período ou limpe os filtros.</p>}
          {!erro && !vazio && !arquivo && <p className="text-xs text-slate-600">Gerando a prévia…</p>}
          {!erro && arquivo && <Previa key={versao} arquivo={arquivo} />}
        </div>
      </div>
    </Janela>
  );
}
