"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";

export default function InfraestruturaPage() {
  const { analytics } = useApp();
  const inf = analytics.infraestrutura;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Análises · Infraestrutura">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Infraestrutura urbana e serviços
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Qualidade dos serviços, acessibilidade e oportunidades de melhoria.
            </p>
          </div>
        </div>

        <AnalyticsHeaderActions
          abaTitulo="Infraestrutura urbana e serviços"
          defaultPeriodo="Mês atual"
        />
      </div>

      {/* Filtros */}
      <FilterBar defaultPeriodo="Mês atual" />

      {/* Card principal: Avaliação detalhada dos serviços da cidade */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs mb-4">
        <div className="flex flex-wrap items-baseline gap-1.5 mb-4">
          <h2 className="text-sm font-bold text-slate-900">
            Avaliação detalhada dos serviços da cidade
          </h2>
          <span className="text-xs text-slate-500">
            · nota média de 1 a 5 · meta 3,0
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {inf.servicos.map((s) => {
            const barColor =
              s.cor === "red"
                ? "bg-[#c84b31]"
                : s.cor === "amber"
                ? "bg-[#d97706]"
                : "bg-[#008767]";
            const labelColor =
              s.cor === "red"
                ? "font-bold text-[#991b1b]"
                : s.cor === "amber"
                ? "font-bold text-[#92400e]"
                : "text-slate-700 font-medium";

            return (
              <div
                key={s.nome}
                className="grid grid-cols-12 items-center gap-3"
              >
                <div className={`col-span-12 sm:col-span-3 ${labelColor}`}>
                  {s.nome}
                </div>
                <div className="col-span-10 sm:col-span-8 bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${(s.nota / 5) * 100}%` }}
                    className={`h-full rounded-full ${barColor}`}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 text-right font-bold text-slate-900">
                  {s.nota.toFixed(1).replace(".", ",")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerta de oportunidade de melhoria */}
        <div className="mt-4 bg-[#fefce8] border border-[#fde047] rounded-lg px-4 py-2.5 text-xs text-slate-800">
          Acessibilidade (2,8) e condições das vias (3,3) concentram as
          oportunidades de melhoria.
        </div>
      </div>

      {/* Linha do meio: Expectativa atendida? + Grupos com PcD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Expectativa atendida?
          </h2>
          <div className="flex items-center gap-6 py-2">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="14"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#008767"
                  strokeWidth="14"
                  strokeDasharray={`${((inf.expectativa.superou + inf.expectativa.atendeu) / 100) * 226} 226`}
                />
              </svg>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>Superou {inf.expectativa.superou}%</div>
              <div>Atendeu {inf.expectativa.atendeu}%</div>
              <div>Não atendeu {inf.expectativa.naoAtendeu}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Grupos com PcD
          </h2>
          <div className="flex items-baseline gap-4 py-5">
            <span className="text-2xl font-extrabold text-[#182657]">
              {inf.gruposPcd}%
            </span>
            <span className="text-xs text-slate-500">
              Deficiência motora · visual · autismo
            </span>
          </div>
        </div>
      </div>

      {/* O que falta em Olímpia? · texto livre, com sentimento */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 mb-3.5">
          <h2 className="text-sm font-bold text-slate-900">
            O que falta em Olímpia?
          </h2>
          <span className="text-xs text-slate-500">
            · texto livre, com sentimento
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-[11px] font-semibold">
            revisar antes de publicar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5">
            <div className="font-bold text-emerald-800 mb-1">Positivo</div>
            <div className="text-slate-800">{inf.sentimentos[0].texto}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="font-bold text-[#182657] mb-1">Neutro</div>
            <div className="text-slate-800">{inf.sentimentos[1].texto}</div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3.5">
            <div className="font-bold text-rose-800 mb-1">Negativo</div>
            <div className="text-slate-800">{inf.sentimentos[2].texto}</div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
