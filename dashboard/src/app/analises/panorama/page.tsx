"use client";

import React from "react";
import { BarChart2 } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";

export default function PanoramaPage() {
  const { analytics } = useApp();
  const p = analytics.panorama;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Análises · Panorama">
      {/* Cabeçalho da página */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Visão geral executiva
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Demanda, padrões de visita e experiência do destino.
            </p>
          </div>
        </div>

        <AnalyticsHeaderActions
          abaTitulo="Visão geral executiva"
          defaultPeriodo="Ano 2026"
        />
      </div>

      {/* Barra de filtros compartilhada */}
      <FilterBar defaultPeriodo="Ano 2026" />

      {/* 3 KPI Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Card 1: Pesquisas coletadas (azul escuro) */}
        <div className="bg-[#182657] text-white rounded-xl p-5 shadow-xs">
          <div className="text-xs text-slate-300 font-medium">
            Pesquisas coletadas
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1.5">
            {p.pesquisasColetadas.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs text-slate-300 mt-1.5 flex items-center gap-1">
            <span>↗</span>
            <span>{p.crescimentoMes}</span>
          </div>
        </div>

        {/* Card 2: Permanência média */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            Permanência média
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900">
              {p.permanenciaMedia}
            </span>
            <span className="text-xs text-slate-600 font-medium">noites</span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            visitantes com pernoite
          </div>
        </div>

        {/* Card 3: NPS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            NPS (índice de recomendação)
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-3xl font-extrabold text-slate-900">
              {p.nps}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
              {p.respostasNps === 0
                ? "Sem dados"
                : p.nps >= 75
                  ? "Excelente"
                  : p.nps >= 50
                    ? "Muito bom"
                    : p.nps >= 0
                      ? "Razoável"
                      : "Crítico"}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {p.promotores}% promotores – {p.detratores}% detratores
          </div>
        </div>
      </div>

      {/* Linha intermediária: Movimentação mensal + NPS recomendação do destino */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Movimentação mensal (sazonalidade) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 mb-6">
            Movimentação mensal (sazonalidade)
          </h2>

          <div>
            <div className="grid grid-cols-12 gap-2 items-end h-36 pt-4">
              {p.sazonalidade.map((item) => (
                <div
                  key={item.mes}
                  className="flex flex-col items-center justify-end h-full group"
                >
                  <div
                    style={{ height: `${Math.min(100, item.valor)}%` }}
                    title={`${item.mes}: ${item.pesquisas} pesquisa(s)`}
                    className="w-full rounded-t-md bg-[#008767] group-hover:bg-[#006e54] transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-2 border-t border-slate-200 pt-2 mt-1">
              {p.sazonalidade.map((item) => (
                <div
                  key={item.mes}
                  className="text-[11px] text-slate-500 text-center"
                >
                  {item.mes}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NPS · recomendação do destino */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            NPS · recomendação do destino
          </h2>

          <div className="flex items-center justify-center sm:justify-start gap-8 py-4 px-2">
            {/* Donut SVG */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#008767"
                  strokeWidth="12"
                  strokeDasharray={`${(p.promotores / 100) * 238.76} 238.76`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-lg font-extrabold text-[#182657]">
                {p.nps}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#008767]" />
                <span>Promotores {p.promotores}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span>Neutros {p.neutros}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Detratores {p.detratores}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha inferior: Principais origens (estados) + Visitante recorrente / Intenção de retorno */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Principais origens (estados) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Principais origens (estados)
          </h2>

          <div className="space-y-3 text-xs">
            {p.origensEstados.length === 0 && (
              <p className="text-slate-400">Ainda não há pesquisas no recorte selecionado.</p>
            )}
            {p.origensEstados.map((item) => (
              <div key={item.uf} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3 text-slate-600 font-medium">
                  {item.uf}
                </div>
                <div className="col-span-9 flex items-center gap-3">
                  <div
                    style={{ width: `${Math.max(12, item.percentual * 1.4)}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {item.detalhe ? item.detalhe : `${item.percentual}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visitante recorrente? & Intenção de retorno */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">
              Visitante recorrente?
            </h2>
            <div className="w-full h-5 rounded-md bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${p.visitanteRecorrente.sim}%` }}
                className="h-full bg-[#008767]"
              />
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              Sim {p.visitanteRecorrente.sim}% · Não {p.visitanteRecorrente.nao}%
            </div>
          </div>

          <div className="pt-1">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Intenção de retorno
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-[#182657]">
                {p.intencaoRetorno}%
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
                Alta intenção
              </span>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
