"use client";

import React, { useState } from "react";
import { History } from "lucide-react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useApp } from "@/context/AppContext";

export default function AuditoriaPage() {
  const { auditoria, exportToExcel } = useApp();

  const [usuarioFilter, setUsuarioFilter] = useState("Todos");
  const [acaoFilter, setAcaoFilter] = useState("Todas");
  const [periodoFilter, setPeriodoFilter] = useState("Últimos 30 dias");
  const [buscaProtocolo, setBuscaProtocolo] = useState("");

  const filtered = auditoria.filter((reg) => {
    if (usuarioFilter !== "Todos" && !reg.usuario.includes(usuarioFilter))
      return false;
    if (acaoFilter !== "Todas" && reg.acao !== acaoFilter) return false;
    if (
      buscaProtocolo &&
      !reg.item.toLowerCase().includes(buscaProtocolo.toLowerCase()) &&
      !(reg.protocoloBadge || "")
        .toLowerCase()
        .includes(buscaProtocolo.toLowerCase()) &&
      !reg.alteracao.toLowerCase().includes(buscaProtocolo.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    const rows = filtered.map((r) => ({
      Data_Hora: r.dataHora,
      Usuario: r.usuario,
      Acao: r.acao,
      Item: r.protocoloBadge ? `${r.item} ${r.protocoloBadge}` : r.item,
      Alteracao: r.alteracao,
    }));
    exportToExcel("Trilha_Auditoria", rows, "OTO_Trilha_Auditoria.xlsx");
  };

  return (
    <SidebarLayout breadcrumb="Inteligência turística / Auditoria">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#182657] shadow-2xs shrink-0 mt-0.5">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Auditoria
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico de alterações. Somente leitura, guardado por pelo menos
              5 anos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs transition"
        >
          Exportar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Usuário:</span>
          <select
            aria-label="Usuário"
            value={usuarioFilter}
            onChange={(e) => setUsuarioFilter(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todos">Todos</option>
            <option value="Coordenação OTO">Coordenação OTO</option>
            <option value="Ana Souza">Ana Souza (app)</option>
            <option value="Hugo Zanni">Hugo Zanni</option>
            <option value="Estagiária">Estagiária</option>
            <option value="Maria Oliveira">Maria Oliveira</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Ação:</span>
          <select
            aria-label="Ação"
            value={acaoFilter}
            onChange={(e) => setAcaoFilter(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Todas">Todas</option>
            <option value="Corrigiu">Corrigiu</option>
            <option value="Sincronizou">Sincronizou</option>
            <option value="Publicou">Publicou</option>
            <option value="Inseriu">Inseriu</option>
            <option value="Excluiu">Excluiu</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄Período:</span>
          <select
            aria-label="Período"
            value={periodoFilter}
            onChange={(e) => setPeriodoFilter(e.target.value)}
            className="font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="Últimos 30 dias">Últimos 30 dias</option>
            <option value="Últimos 7 dias">Últimos 7 dias</option>
            <option value="Últimos 5 anos">Últimos 5 anos</option>
          </select>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <span className="text-slate-400 mr-1">⌄</span>
          <input
            type="text"
            value={buscaProtocolo}
            onChange={(e) => setBuscaProtocolo(e.target.value)}
            placeholder="Buscar protocolo..."
            className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-36"
          />
        </div>
      </div>

      {/* Tabela de Auditoria somente leitura */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 font-medium">
                <th className="py-2.5 pr-4">Data/hora</th>
                <th className="py-2.5 pr-4">Usuário</th>
                <th className="py-2.5 pr-4">Ação</th>
                <th className="py-2.5 pr-4">Item</th>
                <th className="py-2.5">Alteração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((reg) => {
                const badgeClass =
                  reg.acao === "Corrigiu"
                    ? "bg-blue-50 text-blue-800"
                    : reg.acao === "Sincronizou"
                    ? "bg-emerald-50 text-emerald-800"
                    : reg.acao === "Publicou"
                    ? "bg-[#fef08a] text-amber-950"
                    : reg.acao === "Inseriu"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-rose-100 text-rose-800";

                return (
                  <tr key={reg.id} className="text-[#182657]">
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {reg.dataHora}
                    </td>
                    <td className="py-4 pr-4 font-medium">{reg.usuario}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
                      >
                        {reg.acao}
                      </span>
                    </td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <span>{reg.item}</span>
                      {reg.protocoloBadge && (
                        <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold">
                          {reg.protocoloBadge}
                        </span>
                      )}
                    </td>
                    <td className="py-4">{reg.alteracao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
