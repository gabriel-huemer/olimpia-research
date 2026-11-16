"use client";

import React from "react";
import Link from "next/link";
import { LayoutGrid, CornerDownRight } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function ColetaVisaoGeralPage() {
  const { pendentesRevisao, operadores, formularios, canEdit } = useApp();
  const formAtivo =
    formularios.find((f) => f.status === "Ativo") || formularios[0];

  const coletasSemana = [38, 48, 43, 56, 68, 32, 46];

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Visão geral">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Visão geral
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Segunda-feira, 26/10/2026 · Pesquisa de Demanda Turística
          </p>
        </div>
      </div>

      {/* Banner amarelo de respostas sinalizadas */}
      <div className="bg-[#fefce8] border border-[#fde047] rounded-xl px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-800">
          <span className="font-bold text-[#182657]">
            {pendentesRevisao} respostas sinalizadas
          </span>{" "}
          aguardam revisão. A mais antiga tem 3 dias.
        </div>
        <Link
          href="/coleta/revisao"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#182657] hover:bg-[#23366e] text-white text-xs font-semibold transition shrink-0"
        >
          Revisar agora
        </Link>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">
            {(formAtivo?.respostas || 5012).toLocaleString("pt-BR")}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">respostas em 2026</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">63</div>
          <div className="text-xs text-slate-500 mt-1.5">coletadas hoje</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-[#b45309]">
            {pendentesRevisao}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">sinalizadas</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="text-3xl font-extrabold text-slate-900">31</div>
          <div className="text-xs text-slate-500 mt-1.5 leading-snug">
            aguardando sincronização
            <br />
            (4 operadores)
          </div>
        </div>
      </div>

      {/* Operadores · últimos 7 dias + Coletas por dia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">
            Operadores · últimos 7 dias
          </h2>

          <div className="divide-y divide-slate-200">
            {operadores.slice(0, 4).map((op) => (
              <div
                key={op.id}
                className="py-3 grid grid-cols-12 items-center gap-3 text-sm"
              >
                <div className="col-span-4 font-medium text-[#182657]">
                  {op.nome}
                </div>
                <div className="col-span-4">
                  <div
                    style={{
                      width: `${Math.max(20, (op.coletas7Dias / 150) * 100)}%`,
                    }}
                    className="h-3 rounded-full bg-[#008767]"
                  />
                </div>
                <div className="col-span-1 font-extrabold text-[#182657] text-right">
                  {op.coletas7Dias}
                </div>
                <div className="col-span-3 flex justify-end">
                  {op.statusEnvio === "offline" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                      offline {op.ultimoEnvio}
                    </span>
                  ) : op.alertas7Dias === 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
                      0 alertas
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#fef08a] text-amber-950 text-xs font-semibold">
                      {op.alertas7Dias} alerta{op.alertas7Dias > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-6">
              Coletas por dia
            </h2>
            <div className="grid grid-cols-7 gap-2 items-end h-28 border-b border-slate-200 pb-1">
              {coletasSemana.map((val, i) => (
                <div
                  key={i}
                  style={{ height: `${val}%` }}
                  className="w-full rounded-t-md bg-[#008767]"
                />
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Seg a dom · meta diária: 60
            </div>
          </div>
        </div>
      </div>

      {/* Formulário ativo + Atalhos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-2.5">
            Formulário ativo
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#182657] font-medium">
            <span>{formAtivo?.nome || "Pesquisa de Demanda Turística"}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
              ativo
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span>
              {formAtivo?.versao || "v3"} · {formAtivo?.secoes.length || 10}{" "}
              seções · último protocolo
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
              0047/26
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Atalhos</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={canEdit ? "/coleta/formularios/editor" : "/coleta/formularios"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#182657] hover:bg-[#23366e] text-white text-xs font-semibold transition"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Novo formulário</span>
            </Link>

            <Link
              href="/sistema/importacao"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#008767] hover:bg-[#006e54] text-white text-xs font-semibold transition"
            >
              Importar planilha
            </Link>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
