"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function PublicacaoPage() {
  const {
    publicacaoItens,
    ultimaPublicacao,
    metodoPublicacao,
    dispatchAction,
    canEdit,
    showToast,
  } = useApp();

  const [selectedMetodo, setSelectedMetodo] =
    useState<string>(metodoPublicacao);
  const [atualizacaoModo, setAtualizacaoModo] = useState(
    "Manual, após revisão"
  );

  const handleToggleItem = async (id: string) => {
    if (!canEdit) return;
    await dispatchAction("TOGGLE_ITEM_PUBLICACAO", { id });
  };

  const handlePublicarSelecao = async () => {
    if (!canEdit) return;
    await dispatchAction("PUBLICAR_SELECAO_SITE", {
      metodo: selectedMetodo,
    });
    showToast(
      `Seleção publicada com sucesso (${selectedMetodo}) e registrada na Auditoria!`
    );
  };

  const itensMarcados = publicacaoItens.filter((i) => i.publico);

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Publicação (para o site de Olímpia)">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Publicação
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina o que o público pode ver no site da Prefeitura. Nada é
              publicado sem o seu aval.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handlePublicarSelecao}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold shadow-2xs transition"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publicar seleção</span>
          </button>
        )}
      </div>

      {/* Aviso de decisão pendente */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-2 text-xs text-[#182657]">
        <span>
          Em aberto com o cliente: o que pode ser público e o que precisa ser
          anonimizado. Enquanto isso, o padrão é{" "}
          <span className="font-bold">não publicar.</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-[11px] font-semibold">
          decisão pendente
        </span>
      </div>

      {/* Duas colunas: Itens do painel + Como publicar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* Itens do painel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Itens do painel
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                  <th className="py-2 w-12"></th>
                  <th className="py-2">Indicador</th>
                  <th className="py-2">Aba</th>
                  <th className="py-2">Dados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {publicacaoItens.map((item) => {
                  const badgeStyle =
                    item.tagDados === "agregado"
                      ? "bg-emerald-50 text-emerald-800"
                      : item.tagDados === "pode identificar pessoa"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-[#fef08a] text-amber-950";

                  return (
                    <tr key={item.id} className="text-[#182657]">
                      <td className="py-4 pr-2">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggleItem(item.id)}
                          aria-label={`Alternar ${item.indicador}`}
                          className={`w-9 h-5 rounded-full transition relative flex items-center px-0.5 ${
                            item.publico ? "bg-[#008767]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                              item.publico ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-4 pr-3 font-medium leading-snug">
                        {item.indicador}
                      </td>
                      <td className="py-4 pr-3">{item.aba}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${badgeStyle}`}
                        >
                          {item.tagDados}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Como publicar */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
          <h2 className="text-sm font-bold text-slate-900">Como publicar</h2>

          <div className="space-y-2">
            {[
              "Incorporar no site (iframe/link)",
              "Relatório PDF mensal",
              "Planilha Excel de dados abertos",
            ].map((metodo) => {
              const isSelected = selectedMetodo === metodo;
              return (
                <button
                  key={metodo}
                  type="button"
                  onClick={() => setSelectedMetodo(metodo)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition border ${
                    isSelected
                      ? "border-2 border-[#008767] font-semibold text-slate-900 bg-white"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {metodo}
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              ATUALIZAÇÃO
            </label>
            <input
              type="text"
              value={atualizacaoModo}
              disabled={!canEdit}
              onChange={(e) => setAtualizacaoModo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#008767]"
            />
          </div>

          <div className="pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              ÚLTIMA PUBLICAÇÃO
            </div>
            <div className="text-xs text-slate-600">{ultimaPublicacao}</div>
          </div>
        </div>
      </div>

      {/* Pré-visualização do que o público verá */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1.5">
          Pré-visualização do que o público verá
        </h2>
        <p className="text-xs text-slate-500">
          Mesmo visual do painel, só com os {itensMarcados.length} itens
          marcados e sem filtros por cidade pequena (para evitar identificar
          respondentes).
        </p>
      </div>
    </SidebarLayout>
  );
}
