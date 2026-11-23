"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";
import { BOTAO_CLARO, BOTAO_VERDE, CAIXA, Pagina, Tabela } from "@/components/pagina";
import { useApp } from "@/context/AppContext";
import { ErroApi } from "@/lib/cliente/api";
import { useDados } from "@/lib/cliente/useDados";
import type { ImportacaoFeita, ImportacaoLinha, Previa } from "@/lib/importacao/importacao";

async function enviar<T>(arquivo: File, confirmar: boolean): Promise<T> {
  const q = new URLSearchParams({ nome: arquivo.name, ...(confirmar && { confirmar: "1" }) });
  const r = await fetch(`/api/importacoes?${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: arquivo,
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi(r.status, corpo?.erro ?? "Não foi possível enviar o arquivo.");
  return corpo as T;
}

export default function ImportacaoPage() {
  const { exportToExcel, showToast } = useApp();
  const { dados, erro, setErro, recarregar } = useDados<{ importacoes: ImportacaoLinha[]; colunas: string[] }>("/api/importacoes", false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const executar = async (f: () => Promise<void>) => {
    setOcupado(true);
    setErro(null);
    try {
      await f();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const escolher = (a: File | null) => {
    setArquivo(a);
    setPrevia(null);
    if (a) void executar(async () => setPrevia(await enviar<Previa>(a, false)));
  };

  const confirmar = () =>
    executar(async () => {
      if (!arquivo) return;
      const r = await enviar<ImportacaoFeita>(arquivo, true);
      setArquivo(null);
      setPrevia(null);
      recarregar();
      showToast(`${r.validas} pesquisas importadas.`);
    });

  const baixarModelo = () =>
    exportToExcel("Modelo", [Object.fromEntries((dados?.colunas ?? []).map((c) => [c, ""]))], "OTO_Modelo_Importacao.xlsx");

  return (
    <Pagina
      titulo="Importação de dados"
      subtitulo="Planilhas históricas em .xlsx ou .csv. Nada é gravado antes da sua confirmação."
      icone={<Upload className="w-5 h-5" />}
      erro={erro}
      acoes={<button type="button" disabled={!dados} onClick={baixarModelo} className={BOTAO_CLARO}>Baixar modelo</button>}
    >
      <div className={`${CAIXA} mb-4`}>
        <label htmlFor="arquivo" className="block text-sm font-bold text-slate-900 mb-2">Escolha a planilha</label>
        <input
          key={arquivo ? "com" : "sem"}
          id="arquivo"
          type="file"
          accept=".xlsx,.csv"
          disabled={ocupado}
          onChange={(e) => escolher(e.target.files?.[0] ?? null)}
          className={arquivo ? "hidden" : "text-xs"}
        />
        {arquivo && <div className="text-xs text-slate-700">{arquivo.name} {ocupado && "· processando..."}</div>}
        <p className="text-xs text-slate-500 mt-2">
          Aceita a planilha de tabulação da pesquisa de demanda ou o modelo. Uma linha por pesquisa, com a data. Até 3.000 linhas e 8 MB (cerca de 30 segundos por mil linhas).
        </p>
      </div>

      {previa && (
        <div className={`${CAIXA} mb-4`}>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Prévia</h2>
          <ul className="text-xs text-slate-800 space-y-1 mb-3">
            <li><b>{previa.validas}</b> de {previa.total} linhas serão importadas</li>
            <li><b>{previa.duplicadas}</b> duplicadas, que serão ignoradas</li>
            <li><b>{previa.totalErros}</b> com erro, que não serão importadas</li>
            <li><b>{previa.alertas}</b> com valor fora do esperado, que irão para a revisão</li>
            <li><b>{previa.reconhecidas}</b> colunas reconhecidas</li>
            {previa.ignoradas.length > 0 && <li>Colunas ignoradas: {previa.ignoradas.join(", ")}</li>}
          </ul>
          {previa.erros.length > 0 && (
            <div className="max-h-60 overflow-y-auto mb-4">
              <Tabela colunas={["Linha", "Problema"]}>
                {previa.erros.map((e) => (
                  <tr key={e.linha}>
                    <td className="py-2 pr-4">{e.linha}</td>
                    <td className="py-2 text-xs">{e.motivo}</td>
                  </tr>
                ))}
              </Tabela>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={ocupado || !previa.validas} onClick={() => void confirmar()} className={BOTAO_VERDE}>
              Importar {previa.validas} pesquisas
            </button>
            <button type="button" disabled={ocupado} onClick={() => escolher(null)} className={BOTAO_CLARO}>Cancelar</button>
          </div>
        </div>
      )}

      <div className={CAIXA}>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Importações feitas</h2>
        {dados?.importacoes.length ? (
          <Tabela colunas={["Data", "Arquivo", "Por", "Importadas", "Duplicadas", "Com erro"]}>
            {dados.importacoes.map((i) => (
              <tr key={i.id}>
                <td className="py-3 pr-4 whitespace-nowrap">{i.quando}</td>
                <td className="py-3 pr-4 font-medium break-all">{i.arquivo}</td>
                <td className="py-3 pr-4">{i.usuario}</td>
                <td className="py-3 pr-4">{i.importadas} de {i.total}</td>
                <td className="py-3 pr-4">{i.duplicadas}</td>
                <td className="py-3">{i.erros}</td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <p className="text-xs text-slate-500">{dados ? "Nenhuma importação ainda." : "Carregando..."}</p>
        )}
      </div>
    </Pagina>
  );
}
