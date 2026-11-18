"use client";

import React from "react";
import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AnalyticsHeaderActions, FilterBar } from "@/components/FilterBar";
import { useApp } from "@/context/AppContext";

export default function ImpactoEconomicoPage() {
  const { analytics } = useApp();
  const eco = analytics.impactoEconomico;

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Análises · Impacto econômico">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Impacto econômico e hospitalidade
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Renda, gastos e hábitos de reserva, hospedagem e alimentação.
            </p>
          </div>
        </div>

        <AnalyticsHeaderActions
          abaTitulo="Impacto econômico e hospitalidade"
          defaultPeriodo="Mês atual"
        />
      </div>

      {/* Filtros */}
      <FilterBar defaultPeriodo="Mês atual" />

      {/* Aviso de Dependência de dados (UC15 / PDF pág. 3) */}
      <div className="bg-[#fefce8] border border-[#fde047] rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-800">
          <span className="font-bold text-slate-900">Dependência de dados:</span>{" "}
          renda familiar não é coletada no app mobile. Inclua a pergunta na
          Seção 10 do formulário.
        </div>
        <Link
          href="/coleta/formularios/editor?secao=10"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs shrink-0"
        >
          Abrir editor de formulário
        </Link>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#182657] text-white rounded-xl p-5 shadow-xs">
          <div className="text-xs text-slate-300 font-medium">
            Gasto diário médio por pessoa
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1.5">
            R$ {eco.gastoDiarioMedio}
          </div>
          <div className="text-xs text-slate-300 mt-1.5">
            média ponderada por faixa de renda
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            Renda mais comum
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
            {eco.rendaMaisComum}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {eco.percentualRendaMaisComum}% dos visitantes
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">
            Antecedência de reserva
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
            {eco.antecedenciaMediaDias} dias
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            intervalo entre reserva e viagem
          </div>
        </div>
      </div>

      {/* Gasto diário × renda familiar + Antecedência da reserva */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-baseline gap-1.5 mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              Gasto diário × renda familiar
            </h2>
            <span className="text-xs text-slate-500">· média por faixa</span>
          </div>

          <div className="space-y-3 text-xs">
            {eco.gastoPorRenda.map((item) => (
              <div
                key={item.faixa}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-4 sm:col-span-3 text-slate-600">
                  {item.faixa}
                </div>
                <div className="col-span-8 sm:col-span-9 flex items-center gap-3">
                  <div
                    style={{ width: `${item.percentualBarra}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    R$ {item.valor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Antecedência da reserva
          </h2>

          <div className="space-y-3 text-xs">
            {eco.antecedenciaDistribuicao.map((item) => (
              <div
                key={item.faixa}
                className="grid grid-cols-12 items-center gap-2"
              >
                <div className="col-span-5 text-slate-600">{item.faixa}</div>
                <div className="col-span-7 flex items-center gap-3">
                  <div
                    style={{ width: `${item.percentual * 1.6}%` }}
                    className="h-3.5 rounded-full bg-[#008767]"
                  />
                  <span className="font-bold text-slate-900">
                    {item.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tipo de hospedagem + Onde faz as refeições */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Tipo de hospedagem
          </h2>
          <div className="flex flex-wrap gap-2">
            {eco.tipoHospedagem.map((h) => (
              <span
                key={h.rotulo}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800"
              >
                {h.rotulo} {h.percentual}%
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Onde faz as refeições
          </h2>
          <div className="flex flex-wrap gap-2">
            {eco.ondeRefeicoes.map((r) => (
              <span
                key={r.rotulo}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-800"
              >
                {r.rotulo} {r.percentual}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
