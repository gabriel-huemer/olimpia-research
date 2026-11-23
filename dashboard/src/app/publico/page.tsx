"use client";

import React from "react";
import { Indicadores } from "@/components/Indicadores";
import { BOTAO_CLARO } from "@/components/pagina";
import { useDados } from "@/lib/cliente/useDados";
import { downloadExcelXml } from "@/lib/excel";
import type { IndicadorPublico } from "@/lib/publicacao/publicacao";

// Página pública que o site da Prefeitura incorpora (RF21). Mostra só o que foi aprovado.
export default function PublicoPage() {
  const { dados, erro } = useDados<{ ano: number; indicadores: IndicadorPublico[] }>("/api/publico", false);
  const lista = dados?.indicadores ?? [];
  const planilha = () =>
    downloadExcelXml(
      "Dados abertos",
      lista.flatMap((i) => i.series.map((s) => ({ Indicador: i.titulo, Item: s.rotulo, Valor: s.texto }))),
      `OTO_Dados_Abertos_${dados?.ano}.xlsx`
    );
  return (
    <main className="min-h-screen bg-slate-50 p-5 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900">Observatório de Turismo de Olímpia</h1>
      <p className="text-xs text-slate-500 mb-4">Pesquisa de Demanda Turística {dados?.ano}</p>
      {lista.length > 0 ? (
        <>
          <Indicadores lista={lista} />
          <div className="flex gap-2 mt-4 print:hidden">
            <button type="button" onClick={planilha} className={BOTAO_CLARO}>Baixar planilha</button>
            <button type="button" onClick={() => window.print()} className={BOTAO_CLARO}>Imprimir ou salvar em PDF</button>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-600">{erro ?? (dados ? "Nenhum indicador publicado no momento." : "Carregando...")}</p>
      )}
    </main>
  );
}
