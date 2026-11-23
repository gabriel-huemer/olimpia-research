"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { Download, Globe } from "lucide-react";
import { JanelaExportar } from "@/components/relatorio/JanelaExportar";
import { SeletorPeriodo } from "@/components/SeletorPeriodo";
import { useApp } from "@/context/AppContext";

export function AnalyticsHeaderActions({
  abaTitulo,
}: {
  abaTitulo: string;
}) {
  const { filters, setFilter, exportarAba, canManageUsers, opcoesFiltro } = useApp();
  const [exportando, setExportando] = useState(false);
  const fechar = useCallback(() => setExportando(false), []);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <SeletorPeriodo valor={filters.periodo} opcoes={opcoesFiltro.periodos} aoMudar={(v) => setFilter("periodo", v)} />

      {/* Botão Publicar no site (só quem tem a área Sistema) */}
      {canManageUsers && (
        <Link
          href="/sistema/publicacao"
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition"
        >
          <Globe className="w-3.5 h-3.5 text-slate-700" />
          <span>Publicar no site</span>
        </Link>
      )}

      {/* Exportar relatório (RF24 / UC16) */}
      <button
        type="button"
        onClick={() => setExportando(true)}
        className="inline-flex items-center gap-2 bg-[#008767] hover:bg-[#006e54] text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-2xs transition"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Exportar relatório</span>
      </button>
      {exportando && <JanelaExportar filtros={filters} aoExcel={() => exportarAba(abaTitulo)} aoFechar={fechar} />}
    </div>
  );
}

export function FilterBar() {
  const { filters, setFilter, resetFilters, opcoesFiltro } = useApp();
  // A opção escolhida continua na lista mesmo se sair das opções do banco.
  const com = (todas: string, lista: string[], atual: string) => [...new Set([todas, ...lista, atual])];

  const filterConfigs = [
    {
      key: "genero" as const,
      label: "Gênero",
      options: com("Todos", opcoesFiltro.generos, filters.genero),
    },
    {
      key: "faixaIdade" as const,
      label: "Faixa de idade",
      options: ["Todas", "0 a 12", "13 a 17", "18 a 29", "30 a 44", "45+"],
    },
    {
      key: "cidade" as const,
      label: "Cidade",
      options: com("Todas", opcoesFiltro.cidades, filters.cidade),
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
      options: com("Todos", opcoesFiltro.locais, filters.localPesquisa),
    },
  ];

  return (
    <div className="space-y-2 mb-5">
      <div className="flex flex-wrap items-center gap-2">
        {filterConfigs.map((fc) => (
          <div
            key={fc.key}
            className="flex max-w-full items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs"
          >
            <span className="text-slate-400 mr-1">{fc.label}:</span>
            <select
              aria-label={fc.label}
              value={filters[fc.key]}
              onChange={(e) => setFilter(fc.key, e.target.value)}
              className="min-w-0 font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
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
          onClick={() => resetFilters()}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 font-medium shadow-2xs transition"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
