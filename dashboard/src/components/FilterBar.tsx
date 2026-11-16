"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, Globe } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AnalyticsHeaderActions({
  abaTitulo,
  defaultPeriodo = "Outubro de 2026",
}: {
  abaTitulo: string;
  defaultPeriodo?: string;
}) {
  const { filters, setFilter, exportReportPdfOrExcel, canEdit } = useApp();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const periodos = [
    "Jan a out 2026",
    "Outubro de 2026",
    "Últimos 30 dias",
    "Ano 2025",
  ];

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Seletor de Período */}
      <div className="relative flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 shadow-2xs">
        <span className="text-slate-400 mr-1">⌄Período:</span>
        <select
          aria-label="Selecionar período"
          value={filters.periodo || defaultPeriodo}
          onChange={(e) => setFilter("periodo", e.target.value)}
          className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
        >
          {periodos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Botão Publicar no site */}
      {canEdit && (
        <Link
          href="/sistema/publicacao"
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition"
        >
          <Globe className="w-3.5 h-3.5 text-slate-700" />
          <span>Publicar no site</span>
        </Link>
      )}

      {/* Botão Exportar relatório (RF24 / UC16) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowExportMenu((v) => !v)}
          className="inline-flex items-center gap-2 bg-[#008767] hover:bg-[#006e54] text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-2xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar relatório</span>
        </button>

        {showExportMenu && (
          <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 text-xs">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(false);
                exportReportPdfOrExcel(abaTitulo, "XLSX");
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 font-medium text-slate-700"
            >
              Planilha Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(false);
                exportReportPdfOrExcel(abaTitulo, "PDF");
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 font-medium text-slate-700"
            >
              Relatório em PDF (Imprimir)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FilterBar({
  defaultPeriodo = "Outubro de 2026",
}: {
  defaultPeriodo?: string;
}) {
  const { filters, setFilter, resetFilters } = useApp();

  const filterConfigs = [
    {
      key: "genero" as const,
      label: "Gênero",
      options: ["Todos", "Feminino", "Masculino"],
    },
    {
      key: "faixaIdade" as const,
      label: "Faixa de idade",
      options: ["Todas", "0 a 12", "13 a 17", "18 a 29", "30 a 44", "45+"],
    },
    {
      key: "cidade" as const,
      label: "Cidade",
      options: [
        "Todas",
        "São Paulo, SP",
        "Campinas, SP",
        "Ribeirão Preto, SP",
        "Belo Horizonte, MG",
      ],
    },
    {
      key: "hospedagem" as const,
      label: "Hospedagem",
      options: ["Todas", "Hotéis", "Resorts", "Aluguel", "Parentes"],
    },
    {
      key: "transporte" as const,
      label: "Transporte",
      options: ["Todos", "Carro", "Ônibus", "Avião"],
    },
    {
      key: "localPesquisa" as const,
      label: "Local da pesquisa",
      options: [
        "Todos",
        "Thermas dos Laranjais",
        "Hot Beach",
        "Praça da Matriz",
      ],
    },
  ];

  return (
    <div className="space-y-2 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        {filterConfigs.map((fc) => (
          <div
            key={fc.key}
            className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs"
          >
            <span className="text-slate-400 mr-1">⌄{fc.label}:</span>
            <select
              aria-label={fc.label}
              value={filters[fc.key]}
              onChange={(e) => setFilter(fc.key, e.target.value)}
              className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              {fc.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => resetFilters(defaultPeriodo)}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 font-medium shadow-2xs transition"
        >
          ⌄Limpar filtros
        </button>

        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold">
          filtros: painel atual
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
          layout: colega
        </span>
      </div>
    </div>
  );
}
