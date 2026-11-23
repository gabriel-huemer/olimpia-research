"use client";

import React from "react";
import { Compass } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";

export default function AtracoesPage() {
  const { analytics } = useApp();
  const at = analytics.atracoes;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Análises · Atrações">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Atrações e mobilidade em Olímpia
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Popularidade das atrações, avaliações e logística de chegada.
            </p>
          </div>
        </div>

        <AnalyticsHeaderActions
          abaTitulo="Atrações e mobilidade em Olímpia"
          defaultPeriodo="Mês atual"
        />
      </div>

      {/* Filtros */}
      <FilterBar defaultPeriodo="Mês atual" />

      {/* Linha superior: Popularidade × avaliação + Atrações mais bem avaliadas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Scatter / Quadrante Popularidade × avaliação */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-wrap items-baseline gap-1.5 mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              Popularidade × avaliação
            </h2>
            <span className="text-xs text-slate-500">
              · visitas declaradas × nota (0 a 5)
            </span>
          </div>

          <div className="relative h-48 border-l border-b border-slate-300 mx-2 my-2">
            {at.pontosQuadrante.map((pt) => {
              const strokeColor =
                pt.cor === "red"
                  ? "border-[#c84b31] bg-[#c84b31]"
                  : pt.cor === "amber"
                  ? "border-[#d97706] bg-[#d97706]"
                  : "border-[#008767] bg-[#008767]";
              return (
                <div
                  key={pt.nome}
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  title={`${pt.nome} — Nota ${pt.nota} (${pt.visitas} visitas)`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center shadow-2xs ${
                      pt.cor === "red"
                        ? "border-[#c84b31]"
                        : pt.cor === "amber"
                        ? "border-[#d97706]"
                        : "border-[#008767]"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${strokeColor}`} />
                  </div>
                  <div className="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#182657] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                    {pt.nome}: {pt.nota} ({pt.visitas} visitas)
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Alta visitação e alta nota (canto superior direito): manter. Baixa
            nota com alta visitação: corrigir.
          </p>
        </div>

        {/* Atrações mais bem avaliadas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Atrações mais bem avaliadas
            </h2>

            <div className="divide-y divide-slate-200">
              {at.maisBemAvaliadas.map((item) => (
                <div
                  key={item.nome}
                  className="py-3.5 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-[#182657]">{item.nome}</span>
                  <div className="flex items-center gap-6">
                    <span className="font-extrabold text-[#182657]">
                      {item.nota}
                    </span>
                    <span className="text-slate-500 w-10 text-right">
                      {item.visitas}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 pt-3">
            * nomes fictícios · nota · visitas
          </div>
        </div>
      </div>

      {/* Linha inferior: Meio principal para chegar + Do aeroporto até Olímpia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Meio principal para chegar
          </h2>
          <div className="space-y-3 text-xs">
            {at.meioChegar.map((m) => (
              <div
                key={m.meio}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-3 text-slate-600">{m.meio}</div>
                <div className="col-span-9 flex items-center gap-3">
                  <div
                    style={{ width: `${Math.max(8, m.percentual * 0.75)}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {m.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Do aeroporto até Olímpia
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {at.doAeroporto.map((op) => (
              <span
                key={op}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium"
              >
                {op}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
            pergunta condicional do mobile
          </span>
        </div>
      </div>
    </SidebarLayout>
  );
}
